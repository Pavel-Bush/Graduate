const paymentService = require('../services/paymentService')

exports.showPaymentForm = async (req, res) => {
	const rental = await paymentService.getRentalForPayment(
		req.params.id,
		req.session.user.id,
	)
	if (rental.user_id !== req.session.user.id)
		return res.status(403).render('errors/403', { currentPage: '' })
	if (rental.status !== 'pending')
		return res.status(400).send('Аренда не ожидает оплаты')
	res.render('payments/pay_rental', {
		title: 'Оплата аренды',
		currentPage: 'rentals',
		rental,
		amount: rental.total_price,
	})
}

exports.processPayment = async (req, res) => {
	try {
		const { rental_id, amount, payment_method, payment_type } = req.body
		await paymentService.processPayment(
			rental_id,
			req.session.user.id,
			amount,
			payment_method || 'card',
			payment_type || 'rental',
		)

		// Перенаправление в зависимости от типа
		if (payment_type === 'services' || payment_type === 'fines') {
			// Возвращаемся на историю аренд (или можно на активные, если услуги ещё не завершены)
			res.redirect('/rentals/history')
		} else {
			res.redirect('/rentals/active')
		}
	} catch (error) {
		console.error(error.message)
		// Если это аренда, покажем форму оплаты снова
		if (req.body.payment_type === 'rental') {
			const rental = await paymentService.getRentalForPayment(
				req.body.rental_id,
				req.session.user.id,
			)
			return res.render('payments/pay_rental', {
				title: 'Оплата аренды',
				currentPage: 'rentals',
				rental,
				amount: rental.total_price,
				errors: [{ msg: error.message }],
			})
		}
		// Для услуг и штрафов можно просто показать 500 или сообщение
		res.status(400).send(error.message)
	}
}

exports.showPayServices = async (req, res) => {
	const rental = await paymentService.getRentalForPayment(
		req.params.id,
		req.session.user.id,
	)
	const total =
		await require('../services/rentalServicesService').calculateTotal(rental.id)
	res.render('payments/pay_services', {
		title: 'Оплата услуг',
		currentPage: 'rentals',
		rentalId: rental.id,
		amount: total,
		description: 'дополнительные услуги и продление',
	})
}

exports.showPayFines = async (req, res) => {
	const rental = await paymentService.getRentalForPayment(
		req.params.id,
		req.session.user.id,
	)
	const total =
		await require('../services/finesService').getUnpaidFinesTotalForRental(
			rental.id,
		)
	res.render('payments/pay_fines', {
		title: 'Оплата штрафов',
		currentPage: 'rentals',
		rentalId: rental.id,
		amount: total,
		description: 'штрафы',
	})
}
