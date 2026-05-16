const carAvailabilityService = require('../services/carAvailabilityService')
const CarModel = require('../models/carModel')
const rentalsService = require('../services/rentalsService')

exports.catalog = async (req, res) => {
	try {
		await rentalsService.expireStaleBookings()
		const filters = {
			start_date: req.query.start_date || '',
			end_date: req.query.end_date || '',
			brand: req.query.brand || '',
			model: req.query.model || '',
			transmission: req.query.transmission || '',
			body_type: req.query.body_type || '',
			seats_min: req.query.seats_min || '',
			parking: req.query.parking || '',
			price_min: req.query.price_min || '',
			price_max: req.query.price_max || '',
			color: req.query.color || '',
			location_id: req.query.location_id || '',
		}

		const models = await carAvailabilityService.getFilteredModels(filters)
		const locations = await carAvailabilityService.getAllLocations()

		res.render('cars/catalog', {
			title: 'Каталог автомобилей',
			currentPage: 'catalog',
			models,
			filters,
			locations,
		})
	} catch (error) {
		console.error(error)
		res.status(500).render('errors/500', { currentPage: '' })
	}
}

exports.details = async (req, res) => {
	try {
		const model = await CarModel.getModelById(req.params.id)
		if (!model) return res.status(404).render('errors/404', { currentPage: '' })
		const locations = await carAvailabilityService.getLocationsForModel(
			req.params.id,
		)
		const colors = await carAvailabilityService.getColorsForModel(req.params.id)
		res.render('cars/details', {
			title: `${model.brand} ${model.model}`,
			currentPage: 'catalog',
			model,
			locations,
			colors,
		})
	} catch (error) {
		console.error(error)
		res.status(500).render('errors/500', { currentPage: '' })
	}
}
