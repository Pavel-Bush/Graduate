const pool = require('../config/db')

class PaymentService {
	async processPayment(rentalId, userId, amount, method = 'card') {
		// Проверка аренды
		const [[rental]] = await pool.query(
			'SELECT * FROM rentals WHERE id = ? AND user_id = ? AND status = ?',
			[rentalId, userId, 'pending'],
		)
		if (!rental) {
			throw new Error('Аренда не найдена или не ожидает оплаты')
		}

		// Ищем незавершённый платёж для этой аренды
		const [pendingPayments] = await pool.query(
			'SELECT * FROM payments WHERE rental_id = ? AND status = ?',
			[rentalId, 'pending'],
		)

		if (pendingPayments.length > 0) {
			const pendingPayment = pendingPayments[0]
			if (method === 'card') {
				// Обновляем существующий платёж: метод и статус
				await pool.query(
					'UPDATE payments SET payment_method = ?, status = ? WHERE id = ?',
					['card', 'completed', pendingPayment.id],
				)
				// Переводим аренду в paid
				await pool.query("UPDATE rentals SET status = 'paid' WHERE id = ?", [
					rentalId,
				])
				return // успешно
			} else {
				// method === 'cash' – уже есть ожидающий платёж
				throw new Error(
					'Оплата наличными уже ожидает подтверждения сотрудником',
				)
			}
		}

		// Нет pending-платежа – создаём новый
		const paymentStatus = method === 'card' ? 'completed' : 'pending'
		await pool.query(
			'INSERT INTO payments (rental_id, user_id, amount, payment_method, status) VALUES (?, ?, ?, ?, ?)',
			[rentalId, userId, amount, method, paymentStatus],
		)

		if (method === 'card') {
			await pool.query("UPDATE rentals SET status = 'paid' WHERE id = ?", [
				rentalId,
			])
		}
	}

	async getRentalForPayment(rentalId, userId = null) {
		const query = 'SELECT * FROM rentals WHERE id = ?'
		const params = [rentalId]
		// userId может проверяться на уровне контроллера, но здесь просто отдаём аренду
		const [rows] = await pool.query(query, params)
		if (!rows.length) throw new Error('Аренда не найдена')
		// Проверка прав доступа будет в контроллере
		return rows[0]
	}

	async getPendingCashPayments() {
		const [rows] = await pool.query(
			`SELECT p.*, u.full_name, c.brand, c.model 
         FROM payments p 
         JOIN rentals r ON p.rental_id = r.id 
         JOIN users u ON p.user_id = u.user_id
         JOIN cars car ON r.car_id = car.id
         JOIN car_models c ON car.model_id = c.id
         WHERE p.payment_method = 'cash' AND p.status = 'pending'`,
		)
		return rows
	}

	async confirmCashPayment(paymentId) {
		const [[payment]] = await pool.query(
			'SELECT * FROM payments WHERE id = ?',
			[paymentId],
		)
		if (!payment) throw new Error('Платёж не найден')
		await pool.query('UPDATE payments SET status = ? WHERE id = ?', [
			'completed',
			paymentId,
		])
		await pool.query(
			"UPDATE rentals SET status = 'paid' WHERE id = ? AND status = 'pending'",
			[payment.rental_id],
		)
	}

	async getPendingCashPaymentByRental(rentalId) {
		const [[payment]] = await pool.query(
			"SELECT id FROM payments WHERE rental_id = ? AND payment_method = 'cash' AND status = 'pending' LIMIT 1",
			[rentalId],
		)
		return payment ? payment.id : null
	}
}

module.exports = new PaymentService()
