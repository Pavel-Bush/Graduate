const carAvailabilityService = require('../services/carAvailabilityService')

exports.list = async (req, res) => {
	try {
		const locations = await carAvailabilityService.getAllLocations()
		// bounding box для карты (OpenStreetMap)
		const lats = locations.map(l => l.latitude).filter(Boolean)
		const lons = locations.map(l => l.longitude).filter(Boolean)
		if (lats.length > 0) {
			const minLat = Math.min(...lats)
			const maxLat = Math.max(...lats)
			const minLon = Math.min(...lons)
			const maxLon = Math.max(...lons)
			// отступы
			const pad = 0.01
			const bbox = `${minLon - pad},${minLat - pad},${maxLon + pad},${maxLat + pad}`
			res.locals.mapBbox = bbox
		} else {
			res.locals.mapBbox = '27.4,53.8,27.7,54.0' // Минск примерно
		}
		res.render('locations/list', {
			title: 'Локации',
			currentPage: 'locations',
			locations,
		})
	} catch (error) {
		console.error(error)
		res.status(500).render('errors/500', { currentPage: '' })
	}
}
