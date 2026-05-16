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

	async findAvailableCar(modelId, locationId, startDatetime, endDatetime) {
		const [rows] = await pool.query(
			`SELECT c.id FROM cars c
         WHERE c.model_id = ? AND c.location_id = ? AND c.status = 'available'
           AND c.id NOT IN (
               SELECT car_id FROM rentals 
               WHERE status IN ('pending', 'paid', 'active', 'completed')
                 AND start_datetime < ? 
                 AND COALESCE(blocked_until, end_datetime) > ?
           )
         ORDER BY RAND() LIMIT 1`,
			[modelId, locationId, endDatetime, startDatetime],
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

	async getFilteredModels(filters) {
		const {
			start_date,
			end_date,
			brand,
			model,
			transmission,
			body_type,
			seats_min,
			parking,
			price_min,
			price_max,
			color,
			location_id,
		} = filters
		let query = `SELECT cm.*, 
                        GROUP_CONCAT(DISTINCT c.color ORDER BY c.color SEPARATOR ',') AS colors,
                        COUNT(c.id) AS total_cars`
		let where = []
		let params = []

		if (start_date && end_date && new Date(start_date) < new Date(end_date)) {
			const endDt = end_date + ' 23:59:59'
			const startDt = start_date + ' 00:00:00'
			query += `,
            SUM(CASE WHEN c.id NOT IN (
                SELECT r.car_id FROM rentals r
                WHERE r.status IN ('pending', 'paid', 'active', 'completed')
                  AND r.start_datetime < ?
                  AND COALESCE(r.blocked_until, r.end_datetime) > ?
            ) THEN 1 ELSE 0 END) AS available_count`
			params.push(endDt, startDt)
		} else {
			query += `, 0 AS available_count`
		}

		query += ` FROM car_models cm JOIN cars c ON cm.id = c.model_id AND c.status = 'available'`

		if (brand) {
			where.push('cm.brand = ?')
			params.push(brand)
		}
		if (model) {
			where.push('cm.model LIKE ?')
			params.push(`%${model}%`)
		}
		if (transmission) {
			where.push('cm.transmission = ?')
			params.push(transmission)
		}
		if (body_type) {
			where.push('cm.body_type = ?')
			params.push(body_type)
		}
		if (seats_min) {
			where.push('cm.seats >= ?')
			params.push(parseInt(seats_min))
		}
		if (parking === '1') {
			where.push('cm.has_parking_sensors = 1')
		}
		if (price_min) {
			where.push('cm.base_price_per_day >= ?')
			params.push(parseFloat(price_min))
		}
		if (price_max) {
			where.push('cm.base_price_per_day <= ?')
			params.push(parseFloat(price_max))
		}
		if (location_id) {
			where.push('c.location_id = ?')
			params.push(location_id)
		}

		if (where.length) query += ' WHERE ' + where.join(' AND ')
		query += ' GROUP BY cm.id'

		// HAVING для доступности и цвета
		let having = []
		if (start_date && end_date && new Date(start_date) < new Date(end_date)) {
			having.push('available_count > 0')
		}
		if (color) {
			having.push('FIND_IN_SET(?, colors) > 0')
			params.push(color)
		}
		if (having.length) query += ' HAVING ' + having.join(' AND ')

		query += ' ORDER BY cm.brand, cm.model'
		const [rows] = await pool.query(query, params)
		return rows
	}

	async getAllLocations() {
		const [rows] = await pool.query('SELECT * FROM locations ORDER BY name')
		return rows
	}

	async getLocationsForModel(modelId) {
		const [rows] = await pool.query(
			`SELECT DISTINCT l.* FROM cars c 
				JOIN locations l ON c.location_id = l.id 
				WHERE c.model_id = ? AND c.status = 'available'`,
			[modelId],
		)
		return rows
	}

	async getColorsForModel(modelId) {
		const [rows] = await pool.query(
			'SELECT DISTINCT color FROM cars WHERE model_id = ? AND color IS NOT NULL AND status = ? ORDER BY color',
			[modelId, 'available'],
		)
		return rows.map(r => r.color)
	}
}
module.exports = new CarAvailabilityService()
