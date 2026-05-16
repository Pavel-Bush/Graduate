const pool = require('../config/db')
const carAvailabilityService = require('./carAvailabilityService')
const pricingService = require('./pricingService')
const CarModel = require('../models/carModel')
const finesService = require('./finesService')
const { hasSufficientLicense } = require('../utils/licenseCategoryUtils')
const rentalServicesService = require('./rentalServicesService')
const UserModel = require('../models/userModel')
const FineModel = require('../models/fineModel')

class RentalsService {
	async createRental(userId, modelId, startDatetime, endDatetime, locationId) {
		// Проверка просроченной активной аренды
		const [overdue] = await pool.query(
			'SELECT id FROM rentals WHERE user_id = ? AND status = ? AND end_datetime < NOW()',
			[userId, 'active'],
		)
		if (overdue.length > 0) {
			throw new Error(
				'У вас есть просроченная аренда. Верните автомобиль перед новым бронированием.',
			)
		}

		// Проверка долгов
		if (await finesService.hasUnpaidFines(userId)) {
			throw new Error(
				'У вас есть неоплаченные штрафы. Бронирование невозможно.',
			)
		}
		if (await rentalServicesService.hasUnpaidServices(userId)) {
			throw new Error(
				'У вас есть неоплаченные дополнительные услуги. Бронирование невозможно.',
			)
		}

		// Получаем пользователя
		const user = await UserModel.findById(userId)
		if (!user) throw new Error('Пользователь не найден')

		// Категории прав из JSON поля (может быть null)
		let userCategories = []
		if (user.license_categories) {
			try {
				userCategories =
					typeof user.license_categories === 'string'
						? JSON.parse(user.license_categories)
						: user.license_categories
			} catch (e) {
				userCategories = []
			}
		}

		// Получаем модель
		const model = await CarModel.getModelById(modelId)
		if (!model) throw new Error('Модель не найдена')

		// Проверка категории прав
		if (model.required_license_category) {
			if (
				!hasSufficientLicense(userCategories, model.required_license_category)
			) {
				throw new Error(
					`Для данной модели требуется категория ${model.required_license_category}`,
				)
			}
		}

		// Проверка минимального стажа
		if (model.min_experience && user.license_issue_date) {
			const issueDate = new Date(user.license_issue_date)
			const today = new Date()
			let experience = today.getFullYear() - issueDate.getFullYear()
			const monthDiff = today.getMonth() - issueDate.getMonth()
			if (
				monthDiff < 0 ||
				(monthDiff === 0 && today.getDate() < issueDate.getDate())
			) {
				experience--
			}
			if (experience < model.min_experience) {
				throw new Error(
					`Требуемый минимальный стаж вождения: ${model.min_experience} г.`,
				)
			}
		}

		// Поиск доступного автомобиля
		const carId = await carAvailabilityService.findAvailableCar(
			modelId,
			locationId,
			startDatetime,
			endDatetime,
		)
		if (!carId) {
			throw new Error('Все автомобили данной модели заняты на выбранные даты')
		}

		// Расчёт стоимости
		const basePrice = model.base_price_per_day
		const totalPrice = pricingService.calculatePrice(
			basePrice,
			startDatetime,
			endDatetime,
		)

		// Создание аренды
		const [result] = await pool.query(
			`INSERT INTO rentals (user_id, car_id, start_datetime, end_datetime, status, total_price)
         VALUES (?, ?, ?, ?, 'pending', ?)`,
			[userId, carId, startDatetime, endDatetime, totalPrice],
		)

		return { rentalId: result.insertId, totalPrice, carId }
	}

	async getActiveRentalsByUser(userId) {
		const [rows] = await pool.query(
			`SELECT r.*, cm.brand, cm.model, c.license_plate, l.name AS location_name
         FROM rentals r
         JOIN cars c ON r.car_id = c.id
         JOIN car_models cm ON c.model_id = cm.id
         LEFT JOIN locations l ON c.location_id = l.id
         WHERE r.user_id = ? AND r.status IN ('pending', 'paid', 'active')
         ORDER BY r.start_datetime`,
			[userId],
		)
		return rows
	}

	async cancelRental(rentalId, userId) {
		const [rental] = await pool.query(
			'SELECT * FROM rentals WHERE id = ? AND user_id = ? AND status = ?',
			[rentalId, userId, 'pending'],
		)
		if (!rental.length) {
			throw new Error('Бронирование не найдено или его нельзя отменить')
		}
		await pool.query('UPDATE rentals SET status = ? WHERE id = ?', [
			'cancelled',
			rentalId,
		])
	}

	async completeRental(rentalId) {
		const [rental] = await pool.query('SELECT * FROM rentals WHERE id = ?', [
			rentalId,
		])
		if (!rental.length) throw new Error('Аренда не найдена')
		if (rental[0].status !== 'active') throw new Error('Аренда не активна')
		const now = new Date()
		const nowStr = now.toISOString().slice(0, 19).replace('T', ' ')
		const blocked = new Date(now.getTime() + 12 * 60 * 60 * 1000)
			.toISOString()
			.slice(0, 19)
			.replace('T', ' ')
		await pool.query(
			'UPDATE rentals SET status = ?, actual_end_datetime = ?, blocked_until = ? WHERE id = ?',
			['completed', nowStr, blocked, rentalId],
		)
	}

	async getRentalById(rentalId) {
		const [rental] = await pool.query('SELECT * FROM rentals WHERE id = ?', [
			rentalId,
		])
		return rental[0] || null
	}

	async getAllRentals() {
		const [rows] = await pool.query(
			`SELECT r.*, cm.brand, cm.model, c.license_plate, u.full_name
         FROM rentals r
         JOIN cars c ON r.car_id = c.id
         JOIN car_models cm ON c.model_id = cm.id
         JOIN users u ON r.user_id = u.user_id
         ORDER BY r.start_datetime DESC`,
		)
		return rows
	}

	async startRental(rentalId) {
		const [[rental]] = await pool.query('SELECT * FROM rentals WHERE id = ?', [
			rentalId,
		])
		if (!rental) throw new Error('Аренда не найдена')
		if (rental.status !== 'paid') throw new Error('Аренда не оплачена')
		await pool.query('UPDATE rentals SET status = ? WHERE id = ?', [
			'active',
			rentalId,
		])
	}

	async extendRental(rentalId, additionalDays) {
		if (additionalDays < 1)
			throw new Error('Количество дней должно быть положительным')
		const connection = await pool.getConnection()
		try {
			await connection.beginTransaction()

			const [[rental]] = await connection.query(
				'SELECT * FROM rentals WHERE id = ? FOR UPDATE',
				[rentalId],
			)
			if (!rental) throw new Error('Аренда не найдена')
			if (rental.status !== 'active')
				throw new Error('Продлить можно только активную аренду')

			const currentEnd = new Date(rental.end_datetime)
			const newEnd = new Date(currentEnd)
			newEnd.setDate(newEnd.getDate() + additionalDays)
			const newEndStr = newEnd.toISOString().slice(0, 19).replace('T', ' ')

			// Проверка доступности на новый период
			const available = await carAvailabilityService.isCarAvailableForExtension(
				rental.car_id,
				rental.id,
				currentEnd.toISOString().slice(0, 19).replace('T', ' '),
				newEndStr,
			)
			if (!available)
				throw new Error('Автомобиль недоступен на запрашиваемый период')

			// Цена модели
			const [[model]] = await connection.query(
				`SELECT cm.base_price_per_day FROM cars c JOIN car_models cm ON c.model_id = cm.id WHERE c.id = ?`,
				[rental.car_id],
			)
			if (!model) throw new Error('Модель не найдена')
			const pricePerDay = model.base_price_per_day

			// Обновляем дату окончания
			await connection.query(
				'UPDATE rentals SET end_datetime = ? WHERE id = ?',
				[newEndStr, rentalId],
			)

			// Находим услугу "Продление аренды"
			const [[service]] = await connection.query(
				'SELECT id FROM services WHERE name = ?',
				['Продление аренды'],
			)
			if (!service)
				throw new Error('Служебная услуга "Продление аренды" не найдена')

			// Вставляем запись об услуге с правильной ценой
			await connection.query(
				'INSERT INTO rental_services (rental_id, service_id, unit_price, quantity, is_paid) VALUES (?, ?, ?, ?, 0)',
				[rentalId, service.id, pricePerDay, additionalDays],
			)

			await connection.commit()
			return { newEnd: newEndStr, additionalCost: pricePerDay * additionalDays }
		} catch (err) {
			await connection.rollback()
			throw err
		} finally {
			connection.release()
		}
	}

	async getCompletedRentalsByUser(userId) {
		const [rows] = await pool.query(
			`SELECT r.*, cm.brand, cm.model, c.license_plate
         FROM rentals r
         JOIN cars c ON r.car_id = c.id
         JOIN car_models cm ON c.model_id = cm.id
         WHERE r.user_id = ? AND r.status IN ('completed', 'cancelled')
         ORDER BY r.start_datetime DESC`,
			[userId],
		)
		return rows
	}

	async getRentalDetails(rentalId, userId) {
		// Основная информация аренды + авто + модель + локация
		const [[rental]] = await pool.query(
			`SELECT r.*, cm.brand, cm.model, cm.transmission, cm.fuel_type, cm.body_type,
                c.license_plate, c.color, l.name AS location_name
         FROM rentals r
         JOIN cars c ON r.car_id = c.id
         JOIN car_models cm ON c.model_id = cm.id
         LEFT JOIN locations l ON c.location_id = l.id
         WHERE r.id = ? AND r.user_id = ?`,
			[rentalId, userId],
		)
		if (!rental) return null

		// Услуги (все, включая продление)
		const services = await rentalServicesService.getServicesForRental(rentalId)

		// Штрафы
		const fines = await FineModel.getByRentalId(rentalId) // нужно добавить метод в FineModel

		return { ...rental, services, fines }
	}

	async expireStaleBookings() {
		await pool.query(
			"UPDATE rentals SET status = 'expired' WHERE status = 'pending' AND start_datetime < NOW()",
		)
	}
}

module.exports = new RentalsService()
