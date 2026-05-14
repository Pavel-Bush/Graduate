const carAvailabilityService = require('../services/carAvailabilityService')
const CarModel = require('../models/carModel')

exports.catalog = async (req, res) => {
	try {
		let { start_date, end_date } = req.query
		let models

		if (start_date && end_date && new Date(start_date) < new Date(end_date)) {
			// Приводим к DATETIME: начало дня и конец дня
			const startDt = start_date + ' 00:00:00'
			const endDt = end_date + ' 23:59:59'
			models = await carAvailabilityService.getAvailableModelsInPeriod(
				startDt,
				endDt,
			)
		} else {
			models = await carAvailabilityService.getAllModels()
		}

		res.render('cars/catalog', {
			title: 'Каталог автомобилей',
			currentPage: 'catalog',
			models,
			filters: {
				start_date: start_date || '',
				end_date: end_date || '',
			},
		})
	} catch (error) {
		console.error(error)
		res.status(500).render('errors/500', { currentPage: '' })
	}
}

exports.details = async (req, res) => {
	try {
		const model = await CarModel.getModelById(req.params.id)
		if (!model) {
			return res.status(404).render('errors/404', { currentPage: '' })
		}
		res.render('cars/details', {
			title: `${model.brand} ${model.model}`,
			currentPage: 'catalog',
			model,
		})
	} catch (error) {
		console.error(error)
		res.status(500).render('errors/500', { currentPage: '' })
	}
}
