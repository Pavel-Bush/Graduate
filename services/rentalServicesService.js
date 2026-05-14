const pool = require('../config/db')

class RentalServicesService {
	async saveServices(rentalId, servicesData) {
		const connection = await pool.getConnection()
		try {
			await connection.beginTransaction()
			await connection.query(
				'DELETE FROM rental_services WHERE rental_id = ?',
				[rentalId],
			)
			for (const s of servicesData) {
				const [service] = await connection.query(
					'SELECT * FROM services WHERE id = ?',
					[s.service_id],
				)
				if (!service.length) continue
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
			'SELECT SUM(unit_price * quantity) AS total FROM rental_services WHERE rental_id = ?',
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
}
module.exports = new RentalServicesService()
