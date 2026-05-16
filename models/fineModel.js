const pool = require('../config/db')

const FineModel = {
	async create({ user_id, rental_id, amount, reason }) {
		const [result] = await pool.query(
			'INSERT INTO fines (user_id, rental_id, amount, reason) VALUES (?, ?, ?, ?)',
			[user_id, rental_id, amount, reason],
		)
		return result.insertId
	},
	async getByUserId(userId) {
		const [rows] = await pool.query(
			'SELECT * FROM fines WHERE user_id = ? ORDER BY created_at DESC',
			[userId],
		)
		return rows
	},
	async getUnpaidByUserId(userId) {
		const [rows] = await pool.query(
			'SELECT * FROM fines WHERE user_id = ? AND status = ? ORDER BY created_at DESC',
			[userId, 'unpaid'],
		)
		return rows
	},
	async markPaid(fineId) {
		await pool.query('UPDATE fines SET status = ? WHERE id = ?', [
			'paid',
			fineId,
		])
	},
	async getByRentalId(rentalId) {
		const [rows] = await pool.query(
			'SELECT * FROM fines WHERE rental_id = ? ORDER BY created_at DESC',
			[rentalId],
		)
		return rows
	},
}

module.exports = FineModel
