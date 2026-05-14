const FineModel = require('../models/fineModel')
const pool = require('../config/db')

class FinesService {
	async addFine(rentalId, userId, amount, reason) {
		// проверка, что аренда принадлежит пользователю и не отменена
		const [[rental]] = await pool.query(
			'SELECT * FROM rentals WHERE id = ? AND user_id = ? AND status != ?',
			[rentalId, userId, 'cancelled'],
		)
		if (!rental) throw new Error('Аренда не найдена или отменена')
		return FineModel.create({
			user_id: userId,
			rental_id: rentalId,
			amount,
			reason,
		})
	}

	async getUserFines(userId) {
		return FineModel.getByUserId(userId)
	}

	async hasUnpaidFines(userId) {
		const fines = await FineModel.getUnpaidByUserId(userId)
		return fines.length > 0
	}

	async getUnpaidFinesTotalForRental(rentalId) {
		const [[{ total }]] = await pool.query(
			'SELECT SUM(amount) AS total FROM fines WHERE rental_id = ? AND status = ?',
			[rentalId, 'unpaid'],
		)
		return total || 0
	}
}

module.exports = new FinesService()
