const pool = require('../config/db')

const ServiceModel = {
	async getAll() {
		const [rows] = await pool.query('SELECT * FROM services ORDER BY name')
		return rows
	},
	async getById(id) {
		const [rows] = await pool.query('SELECT * FROM services WHERE id = ?', [id])
		return rows[0] || null
	},
}

module.exports = ServiceModel
