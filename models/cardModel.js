const pool = require('../config/db')

const CardModel = {
	async getUserCards(userId) {
		const [rows] = await pool.query(
			'SELECT * FROM payment_cards WHERE user_id = ? ORDER BY is_default DESC, created_at DESC',
			[userId],
		)
		return rows
	},

	async addCard(userId, cardNumber) {
		const last4 = cardNumber.slice(-4)
		const token =
			'tok_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
		const connection = await pool.getConnection()
		try {
			await connection.beginTransaction()
			// Если это первая карта пользователя, делаем её основной
			const [existing] = await connection.query(
				'SELECT COUNT(*) AS count FROM payment_cards WHERE user_id = ?',
				[userId],
			)
			const isDefault = existing[0].count === 0
			await connection.query(
				'INSERT INTO payment_cards (user_id, card_token, card_last4, is_default) VALUES (?, ?, ?, ?)',
				[userId, token, last4, isDefault],
			)
			await connection.commit()
		} catch (err) {
			await connection.rollback()
			throw err
		} finally {
			connection.release()
		}
	},

	async deleteCard(cardId, userId) {
		await pool.query('DELETE FROM payment_cards WHERE id = ? AND user_id = ?', [
			cardId,
			userId,
		])
	},

	async setDefault(cardId, userId) {
		const connection = await pool.getConnection()
		try {
			await connection.beginTransaction()
			await connection.query(
				'UPDATE payment_cards SET is_default = FALSE WHERE user_id = ?',
				[userId],
			)
			await connection.query(
				'UPDATE payment_cards SET is_default = TRUE WHERE id = ? AND user_id = ?',
				[cardId, userId],
			)
			await connection.commit()
		} catch (err) {
			await connection.rollback()
			throw err
		} finally {
			connection.release()
		}
	},
}

module.exports = CardModel
