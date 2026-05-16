const pool = require('../config/db')
const { hasSufficientLicense } = require('../utils/licenseCategoryUtils')
const UserModel = require('../models/userModel')

class RentalServicesService {
	async saveServices(rentalId, servicesData, userId) {
		// Получаем категории пользователя
		const user = await UserModel.findById(userId)
		let userCategories = []
		if (user && user.license_categories) {
			try {
				userCategories =
					typeof user.license_categories === 'string'
						? JSON.parse(user.license_categories)
						: user.license_categories
			} catch (e) {
				userCategories = []
			}
		}

		const connection = await pool.getConnection()
		try {
			await connection.beginTransaction()
			// Удаляем существующие услуги
			await connection.query(
				'DELETE FROM rental_services WHERE rental_id = ?',
				[rentalId],
			)
			// Проверяем каждую услугу
			for (const s of servicesData) {
				const [service] = await connection.query(
					'SELECT * FROM services WHERE id = ?',
					[s.service_id],
				)
				if (!service.length) continue

				// Проверка категории для услуги
				if (service[0].required_license_category) {
					let requiredCat = service[0].required_license_category
					if (service[0].name === 'Прицеп') {
						// Определяем трансмиссию автомобиля, к которому привязана аренда
						const [[car]] = await connection.query(
							`SELECT cm.transmission 
								FROM cars c 
								JOIN car_models cm ON c.model_id = cm.id 
								WHERE c.id = (SELECT car_id FROM rentals WHERE id = ?)`,
							[rentalId],
						)
						if (!car)
							throw new Error('Не удалось определить трансмиссию автомобиля')
						requiredCat = car.transmission === 'automatic' ? 'BE_AT' : 'BE'
					}
					if (requiredCat) {
						if (!hasSufficientLicense(userCategories, requiredCat)) {
							throw new Error(
								`Для услуги "${service[0].name}" требуется категория ${requiredCat}`,
							)
						}
					}
				}

				await connection.query(
					'INSERT INTO rental_services (rental_id, service_id, unit_price, quantity) VALUES (?, ?, ?, ?)',
					[rentalId, s.service_id, service[0].base_price, s.quantity],
				)
			}
			await connection.commit()
		} catch (err) {
			await connection.rollback()
			throw err
		} finally {
			connection.release()
		}
	}

	async getServicesForRental(rentalId) {
		const [rows] = await pool.query(
			`SELECT rs.*, s.name, s.unit_type FROM rental_services rs
             JOIN services s ON rs.service_id = s.id
             WHERE rs.rental_id = ?`,
			[rentalId],
		)
		return rows
	}

	async calculateTotal(rentalId) {
		const [[{ total }]] = await pool.query(
			'SELECT SUM(unit_price * quantity) AS total FROM rental_services WHERE rental_id = ? AND is_paid = 0',
			[rentalId],
		)
		return total || 0
	}

	async addService(rentalId, serviceId, quantity = 1) {
		const [service] = await pool.query('SELECT * FROM services WHERE id = ?', [
			serviceId,
		])
		if (!service.length) throw new Error('Услуга не найдена')
		await pool.query(
			'INSERT INTO rental_services (rental_id, service_id, unit_price, quantity) VALUES (?, ?, ?, ?)',
			[rentalId, serviceId, service[0].base_price, quantity],
		)
	}

	async hasUnpaidServices(userId) {
		const [rows] = await pool.query(
			`SELECT 1 FROM rental_services rs 
         JOIN rentals r ON rs.rental_id = r.id 
         WHERE r.user_id = ? AND rs.is_paid = 0`,
			[userId],
		)
		return rows.length > 0
	}
}
module.exports = new RentalServicesService()
