const pool = require('../config/db')

class PaymentService {
	async processPayment(
		rentalId,
		userId,
		amount,
		method = 'card',
		paymentType = 'rental',
	) {
		// Проверка аренды для всех типов
		const [[rental]] = await pool.query(
			'SELECT * FROM rentals WHERE id = ? AND user_id = ?',
			[rentalId, userId],
		)
		if (!rental) throw new Error('Аренда не найдена')

		if (paymentType === 'rental') {
			// === Основная оплата аренды (без изменений) ===
			if (rental.status !== 'pending')
				throw new Error('Аренда не ожидает оплаты')

			const [existing] = await pool.query(
				"SELECT id FROM payments WHERE rental_id = ? AND status = 'pending'",
				[rentalId],
			)
			if (existing.length > 0) {
				if (method === 'card') {
					await pool.query(
						"UPDATE payments SET payment_method = 'card', status = 'completed' WHERE id = ?",
						[existing[0].id],
					)
					await pool.query("UPDATE rentals SET status = 'paid' WHERE id = ?", [
						rentalId,
					])
					return
				} else {
					throw new Error(
						'Оплата наличными уже ожидает подтверждения сотрудником',
					)
				}
			}

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
			return
		}

		// === Оплата услуг или штрафов (защита от дублирования) ===
		const connection = await pool.getConnection()
		try {
			await connection.beginTransaction()

			// Блокируем аренду на время транзакции
			await connection.query('SELECT * FROM rentals WHERE id = ? FOR UPDATE', [
				rentalId,
			])

			if (paymentType === 'services') {
				const [[{ unpaidCount }]] = await connection.query(
					'SELECT COUNT(*) AS unpaidCount FROM rental_services WHERE rental_id = ? AND is_paid = 0',
					[rentalId],
				)
				if (unpaidCount === 0) {
					throw new Error('Все услуги уже оплачены')
				}
			} else if (paymentType === 'fines') {
				const [[{ unpaidFines }]] = await connection.query(
					"SELECT COUNT(*) AS unpaidFines FROM fines WHERE rental_id = ? AND status = 'unpaid'",
					[rentalId],
				)
				if (unpaidFines === 0) {
					throw new Error('Все штрафы уже оплачены')
				}
			} else {
				throw new Error('Неизвестный тип оплаты')
			}

			// Создаём один платёж
			await connection.query(
				'INSERT INTO payments (rental_id, user_id, amount, payment_method, status) VALUES (?, ?, ?, ?, ?)',
				[rentalId, userId, amount, method, 'completed'],
			)

			// Обновляем статусы
			if (paymentType === 'services') {
				await connection.query(
					'UPDATE rental_services SET is_paid = 1 WHERE rental_id = ? AND is_paid = 0',
					[rentalId],
				)
			} else if (paymentType === 'fines') {
				await connection.query(
					"UPDATE fines SET status = 'paid' WHERE rental_id = ? AND status = 'unpaid'",
					[rentalId],
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
