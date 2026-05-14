const rentalsService = require('../services/rentalsService')
const CarModel = require('../models/carModel')
const { toMySQLDatetime } = require('../utils/dateUtils')
const rentalServicesService = require('../services/rentalServicesService')
const ServiceModel = require('../models/serviceModel')

// Показать форму создания бронирования
exports.showCreateForm = async (req, res) => {
	try {
		const modelId = req.query.model_id
		if (!modelId) {
			return res.redirect('/cars')
		}
		const model = await CarModel.getModelById(modelId)
		if (!model) {
			return res.status(404).render('errors/404', { currentPage: '' })
		}
		res.render('rentals/create', {
			title: `Забронировать ${model.brand} ${model.model}`,
			currentPage: 'catalog',
			model,
			errors: [],
			formData: {},
		})
	} catch (error) {
		console.error(error)
		res.status(500).render('errors/500', { currentPage: '' })
	}
}

exports.createRental = async (req, res) => {
	try {
		const { model_id, start_datetime, end_datetime } = req.body
		const model = await CarModel.getModelById(model_id)
		if (!model) {
			return res.status(404).render('errors/404', { currentPage: '' })
		}

		// Преобразуем даты к формату MySQL
		const startDt = toMySQLDatetime(start_datetime)
		const endDt = toMySQLDatetime(end_datetime)

		// Валидация дат
		if (!startDt || !endDt || new Date(startDt) >= new Date(endDt)) {
			return res.render('rentals/create', {
				title: `Забронировать ${model.brand} ${model.model}`,
				currentPage: 'catalog',
				model,
				errors: [{ msg: 'Некорректные даты аренды' }],
				formData: req.body,
			})
		}
		if (new Date(startDt) < new Date()) {
			return res.render('rentals/create', {
				title: `Забронировать ${model.brand} ${model.model}`,
				currentPage: 'catalog',
				model,
				errors: [{ msg: 'Дата начала не может быть в прошлом' }],
				formData: req.body,
			})
		}

		await rentalsService.createRental(
			req.session.user.id,
			parseInt(model_id),
			startDt,
			endDt,
		)

		res.redirect('/rentals/active')
	} catch (error) {
		console.error(error)
		const model = await CarModel.getModelById(req.body.model_id)
		res.render('rentals/create', {
			title: model ? `Забронировать ${model.brand} ${model.model}` : 'Ошибка',
			currentPage: 'catalog',
			model: model || {},
			errors: [{ msg: error.message || 'Ошибка при создании бронирования' }],
			formData: req.body,
		})
	}
}

// Активные аренды пользователя
exports.showActiveRentals = async (req, res) => {
	const rentals = await rentalsService.getActiveRentalsByUser(
		req.session.user.id,
	)
	res.render('rentals/active', {
		title: 'Мои аренды',
		currentPage: 'rentals',
		rentals,
	})
}

// Отмена бронирования
exports.cancelRental = async (req, res) => {
	await rentalsService.cancelRental(req.params.id, req.session.user.id)
	res.redirect('/rentals/active')
}

exports.showHistory = async (req, res) => {
	const rentals = await rentalsService.getCompletedRentalsByUser(
		req.session.user.id,
	)
	res.render('rentals/history', {
		title: 'История аренд',
		currentPage: 'rentals',
		rentals,
	})
}

// Показать страницу услуг аренды
exports.showServices = async (req, res) => {
	const rental = await rentalsService.getRentalById(req.params.id)
	if (!rental || rental.user_id !== req.session.user.id)
		return res.status(404).render('errors/404', { currentPage: '' })
	if (!['pending', 'paid', 'active'].includes(rental.status))
		return res.status(400).send('Услуги недоступны')
	const allServices = await ServiceModel.getAll()
	const currentServices = await rentalServicesService.getServicesForRental(
		rental.id,
	)
	const servicesMap = {}
	currentServices.forEach(s => {
		servicesMap[s.service_id] = s.quantity
	})
	res.render('rentals/services', {
		title: 'Дополнительные услуги',
		currentPage: 'rentals',
		rental,
		allServices: allServices.filter(s => s.name !== 'Продление аренды'),
		servicesMap,
		errors: [],
	})
}

// Добавить услугу
exports.addService = async (req, res) => {
	try {
		const rentalId = req.params.id
		const { service_id, quantity } = req.body
		const rental = await rentalsService.getRentalById(rentalId)
		if (!rental || rental.user_id !== req.session.user.id) {
			return res.status(404).render('errors/404', { currentPage: '' })
		}
		await rentalServicesService.addService(
			rentalId,
			parseInt(service_id),
			parseFloat(quantity) || 1,
		)
		res.redirect(`/rentals/${rentalId}/services`)
	} catch (error) {
		// Обработка ошибки с повторным рендерингом
		const rentalId = req.params.id
		const rental = await rentalsService.getRentalById(rentalId)
		const services = await rentalServicesService.getServicesForRental(rentalId)
		const allServices = await ServiceModel.getAll()
		res.render('rentals/services', {
			title: 'Дополнительные услуги',
			currentPage: 'rentals',
			rental,
			services,
			allServices,
			errors: [{ msg: error.message }],
		})
	}
}

exports.saveServices = async (req, res) => {
	try {
		const rental = await rentalsService.getRentalById(req.params.id)
		if (!rental || rental.user_id !== req.session.user.id)
			return res.status(404).render('errors/404', { currentPage: '' })
		if (!['pending', 'paid', 'active'].includes(rental.status))
			throw new Error('Нельзя изменять услуги')
		const servicesData = []
		for (const key in req.body) {
			if (key.startsWith('qty_')) {
				const serviceId = parseInt(key.replace('qty_', ''))
				const quantity = parseFloat(req.body[key])
				if (quantity > 0) servicesData.push({ service_id: serviceId, quantity })
			}
		}
		await rentalServicesService.saveServices(rental.id, servicesData)
		res.redirect('/rentals/active')
	} catch (error) {
		const rental = await rentalsService.getRentalById(req.params.id)
		const allServices = await ServiceModel.getAll()
		const currentServices = await rentalServicesService.getServicesForRental(
			rental.id,
		)
		const servicesMap = {}
		currentServices.forEach(s => {
			servicesMap[s.service_id] = s.quantity
		})
		res.render('rentals/services', {
			title: 'Дополнительные услуги',
			currentPage: 'rentals',
			rental,
			allServices: allServices.filter(s => s.name !== 'Продление аренды'),
			servicesMap,
			errors: [{ msg: error.message }],
		})
	}
}

exports.showExtendForm = async (req, res) => {
	const rental = await rentalsService.getRentalById(req.params.id)
	if (!rental || rental.user_id !== req.session.user.id)
		return res.status(404).render('errors/404', { currentPage: '' })
	if (rental.status !== 'active')
		return res.status(400).send('Продление возможно только для активной аренды')
	res.render('rentals/extend', {
		title: 'Продление аренды',
		currentPage: 'rentals',
		rental,
		errors: [],
	})
}

// Обработать продление
exports.extendRental = async (req, res) => {
	try {
		const days = parseInt(req.body.days)
		if (!days || days < 1) throw new Error('Введите корректное количество дней')
		await rentalsService.extendRental(req.params.id, days)
		res.redirect('/rentals/active')
	} catch (error) {
		const rental = await rentalsService.getRentalById(req.params.id)
		res.render('rentals/extend', {
			title: 'Продление аренды',
			currentPage: 'rentals',
			rental,
			errors: [{ msg: error.message }],
		})
	}
}
