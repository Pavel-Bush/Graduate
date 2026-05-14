const pool = require('../config/db')
const carAvailabilityService = require('./carAvailabilityService')
const pricingService = require('./pricingService')
const CarModel = require('../models/carModel')
const finesService = require('./finesService')

class RentalsService {
	async createRental(userId, modelId, startDatetime, endDatetime) {
		// в createRental перед проверкой доступности
		if (await finesService.hasUnpaidFines(userId)) {
			throw new Error(
				'У вас есть неоплаченные штрафы. Бронирование невозможно.',
			)
		}

		// Ищем любой доступный автомобиль модели
		const carId = await carAvailabilityService.findAvailableCar(
			modelId,
			startDatetime,
			endDatetime,
		)
		if (!carId) {
			throw new Error('Все автомобили данной модели заняты на выбранные даты')
		}

		const model = await CarModel.getModelById(modelId)
		if (!model) {
			throw new Error('Модель не найдена')
		}
		const basePrice = model.base_price_per_day
		const totalPrice = pricingService.calculatePrice(
			basePrice,
			startDatetime,
			endDatetime,
		)

		const [result] = await pool.query(
			`INSERT INTO rentals (user_id, car_id, start_datetime, end_datetime, status, total_price)
             VALUES (?, ?, ?, ?, 'pending', ?)`,
			[userId, carId, startDatetime, endDatetime, totalPrice],
		)

		return { rentalId: result.insertId, totalPrice, carId }
	}

	async getActiveRentalsByUser(userId) {
		const [rows] = await pool.query(
			`SELECT r.*, cm.brand, cm.model, c.license_plate
				FROM rentals r
				JOIN cars c ON r.car_id = c.id
				JOIN car_models cm ON c.model_id = cm.id
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

		const rental = await this.getRentalById(rentalId)
		if (!rental) throw new Error('Аренда не найдена')
		if (rental.status !== 'active')
			throw new Error('Продлить можно только активную аренду')

		// Определяем новый срок окончания
		const currentEnd = new Date(rental.end_datetime)
		const newEnd = new Date(currentEnd)
		newEnd.setDate(newEnd.getDate() + additionalDays)
		const newEndStr = newEnd.toISOString().slice(0, 19).replace('T', ' ')

		// Проверка доступности автомобиля на продлённый период (исключая текущую аренду)
		const available = await carAvailabilityService.isCarAvailableForExtension(
			rental.car_id,
			rental.id,
			currentEnd.toISOString().slice(0, 19).replace('T', ' '),
			newEndStr,
		)
		if (!available) {
			throw new Error('Автомобиль недоступен на запрашиваемый период')
		}

		// Получаем цену модели за сутки
		const [[model]] = await pool.query(
			`SELECT cm.base_price_per_day 
             FROM cars c JOIN car_models cm ON c.model_id = cm.id 
             WHERE c.id = ?`,
			[rental.car_id],
		)
		if (!model) throw new Error('Модель не найдена')

		const pricePerDay = model.base_price_per_day
		const totalExtensionPrice = pricePerDay * additionalDays

		// Обновляем дату окончания в rentals
		await pool.query('UPDATE rentals SET end_datetime = ? WHERE id = ?', [
			newEndStr,
			rentalId,
		])

		// Ищем услугу "Продление аренды"
		const [[service]] = await pool.query(
			'SELECT id FROM services WHERE name = ?',
			['Продление аренды'],
		)
		if (!service)
			throw new Error('Служебная услуга "Продление аренды" не найдена')

		// Добавляем запись в rental_services
		await rentalServicesService.addService(rentalId, service.id, additionalDays)

		// Принудительно обновляем цену в добавленной записи (т.к. addService берёт base_price=0)
		await pool.query(
			'UPDATE rental_services SET unit_price = ? WHERE rental_id = ? AND service_id = ?',
			[pricePerDay, rentalId, service.id],
		)

		return { newEnd: newEndStr, additionalCost: totalExtensionPrice }
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
}

module.exports = new RentalsService()
