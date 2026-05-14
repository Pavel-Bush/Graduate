const pool = require('../config/db')

class CarAvailabilityService {
	async isCarAvailable(carId, startDatetime, endDatetime) {
		const [rows] = await pool.query(
			`SELECT id FROM rentals
             WHERE car_id = ?
               AND status IN ('pending', 'paid', 'active', 'completed')
               AND start_datetime < ?
               AND COALESCE(blocked_until, end_datetime) > ?`,
			[carId, endDatetime, startDatetime],
		)
		return rows.length === 0
	}

	async findAvailableCar(modelId, startDatetime, endDatetime) {
		const [rows] = await pool.query(
			`SELECT c.id FROM cars c
             WHERE c.model_id = ?
               AND c.status = 'available'
               AND c.id NOT IN (
                   SELECT car_id FROM rentals
                   WHERE status IN ('pending', 'paid', 'active', 'completed')
                     AND start_datetime < ?
                     AND COALESCE(blocked_until, end_datetime) > ?
               )
             ORDER BY RAND()
             LIMIT 1`,
			[modelId, endDatetime, startDatetime],
		)
		return rows[0]?.id || null
	}

	async getAvailableModelsInPeriod(startDatetime, endDatetime) {
		const [rows] = await pool.query(
			`SELECT cm.*, COUNT(c.id) AS total_cars,
                    SUM(CASE WHEN c.id NOT IN (
                        SELECT r.car_id FROM rentals r
                        WHERE r.status IN ('pending', 'paid', 'active', 'completed')
                          AND r.start_datetime < ?
                          AND COALESCE(r.blocked_until, r.end_datetime) > ?
                    ) THEN 1 ELSE 0 END) AS available_count
             FROM car_models cm
             JOIN cars c ON cm.id = c.model_id AND c.status = 'available'
             GROUP BY cm.id
             HAVING available_count > 0
             ORDER BY cm.brand, cm.model`,
			[endDatetime, startDatetime],
		)
		return rows
	}

	async isCarAvailableForExtension(carId, excludeRentalId, startDate, endDate) {
		const [rows] = await pool.query(
			`SELECT id FROM rentals
             WHERE car_id = ?
               AND id != ?
               AND status IN ('pending', 'paid', 'active', 'completed')
               AND start_datetime < ?
               AND COALESCE(blocked_until, end_datetime) > ?`,
			[carId, excludeRentalId, endDate, startDate],
		)
		return rows.length === 0
	}

	async getAllModels() {
		const [rows] = await pool.query(
			'SELECT * FROM car_models ORDER BY brand, model',
		)
		return rows
	}
}
module.exports = new CarAvailabilityService()
