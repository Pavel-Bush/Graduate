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
		const { rental_id, amount, payment_method } = req.body
		await paymentService.processPayment(
			rental_id,
			req.session.user.id,
			amount,
			payment_method || 'card',
		)
		res.redirect('/rentals/active')
	} catch (error) {
		console.error(error.message)
		// Если ошибка связана с уже ожидающим наличным платежом,
		// показываем страницу оплаты с сообщением
		const rental = await paymentService.getRentalForPayment(
			req.body.rental_id,
			req.session.user.id,
		)
		res.render('payments/pay_rental', {
			title: 'Оплата аренды',
			currentPage: 'rentals',
			rental,
			amount: rental.total_price,
			errors: [{ msg: error.message }],
		})
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
