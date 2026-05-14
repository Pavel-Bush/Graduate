const pool = require('../config/db')

const CarModel = {
	// Получить модель по ID
	async getModelById(modelId) {
		const [rows] = await pool.query('SELECT * FROM car_models WHERE id = ?', [
			modelId,
		])
		return rows[0] || null
	},

	// Получить список моделей (все, без учёта доступности)
	async getAllModels() {
		const [rows] = await pool.query('SELECT * FROM car_models')
		return rows
	},
}

module.exports = CarModel
