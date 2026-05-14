const finesService = require('../services/finesService')
const rentalsService = require('../services/rentalsService')
const paymentService = require('../services/paymentService')

exports.showDashboard = (req, res) => {
	res.render('admin/dashboard', {
		title: 'Админ-панель',
		currentPage: 'admin',
	})
}

// Просмотр всех аренд (для сотрудников/админов)
exports.showRentals = async (req, res) => {
	try {
		const rentals = await rentalsService.getAllRentals()
		for (const rental of rentals) {
			if (rental.status === 'pending') {
				rental.pendingCashPaymentId =
					await paymentService.getPendingCashPaymentByRental(rental.id)
			} else {
				rental.pendingCashPaymentId = null
			}
		}
		res.render('admin/rentals', {
			title: 'Управление арендами',
			currentPage: 'admin',
			rentals,
		})
	} catch (error) {
		console.error(error)
		res.status(500).render('errors/500', { currentPage: '' })
	}
}

// Выдать автомобиль (paid -> active)
exports.startRental = async (req, res) => {
	try {
		await rentalsService.startRental(req.params.id)
		res.redirect('/admin/rentals')
	} catch (error) {
		console.error(error)
		res.status(500).render('errors/500', { currentPage: '' })
	}
}

// Завершить аренду (active -> completed)
exports.completeRental = async (req, res) => {
	try {
		await rentalsService.completeRental(req.params.id)
		res.redirect('/admin/rentals')
	} catch (error) {
		console.error(error)
		res.status(500).render('errors/500', { currentPage: '' })
	}
}

exports.showFinesForm = (req, res) => {
	res.render('admin/fines', {
		title: 'Создать штраф',
		currentPage: 'admin',
		errors: [],
	})
}

exports.createFine = async (req, res) => {
	try {
		const { rental_id, amount, reason } = req.body
		const rental = await rentalsService.getRentalById(rental_id)
		if (!rental) throw new Error('Аренда не найдена')
		await finesService.addFine(
			rental_id,
			rental.user_id,
			parseFloat(amount),
			reason,
		)
		res.redirect('/admin/fines')
	} catch (error) {
		res.render('admin/fines', {
			title: 'Создать штраф',
			currentPage: 'admin',
			errors: [{ msg: error.message }],
		})
	}
}

exports.showPendingCashPayments = async (req, res) => {
	const payments =
		await require('../services/paymentService').getPendingCashPayments()
	res.render('admin/cash_payments', {
		title: 'Наличные платежи',
		currentPage: 'admin',
		payments,
	})
}

exports.confirmCashPayment = async (req, res) => {
	try {
		await paymentService.confirmCashPayment(req.params.id)
		res.redirect('/admin/rentals')
	} catch (error) {
		console.error(error)
		res.status(500).render('errors/500', { currentPage: '' })
	}
}
