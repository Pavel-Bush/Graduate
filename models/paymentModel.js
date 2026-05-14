const pool = require('../config/db')

const PaymentModel = {
	async create({ rental_id, user_id, amount, payment_method, status }) {
		const [result] = await pool.query(
			'INSERT INTO payments (rental_id, user_id, amount, payment_method, status) VALUES (?, ?, ?, ?, ?)',
			[rental_id, user_id, amount, payment_method, status],
		)
		return result.insertId
	},
	async getById(id) {
		const [rows] = await pool.query('SELECT * FROM payments WHERE id = ?', [id])
		return rows[0] || null
	},
	async updateStatus(paymentId, status) {
		await pool.query('UPDATE payments SET status = ? WHERE id = ?', [
			status,
			paymentId,
		])
	},
}

module.exports = PaymentModel
