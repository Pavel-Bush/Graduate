class PricingService {
	// Расчёт стоимости аренды автомобиля по базовой цене и интервалу
	calculatePrice(basePricePerDay, startDatetime, endDatetime) {
		const start = new Date(startDatetime)
		const end = new Date(endDatetime)
		const diffMs = end - start
		const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
		// Минимальная аренда — одни сутки
		const days = Math.max(diffDays, 1)
		return days * basePricePerDay
	}
}

module.exports = new PricingService()
