// Моковые данные автомобилей
const mockCars = [
	{
		id: 1,
		brand: 'Toyota',
		model: 'Camry',
		body_type: 'sedan',
		transmission: 'automatic',
		fuel_type: 'petrol',
		seats: 5,
		price_per_day: 4500,
		image: '/images/cars/camry.jpg',
	},
	{
		id: 2,
		brand: 'Volkswagen',
		model: 'Polo',
		body_type: 'hatchback',
		transmission: 'manual',
		fuel_type: 'petrol',
		seats: 5,
		price_per_day: 3200,
		image: '/images/cars/polo.jpg',
	},
	{
		id: 3,
		brand: 'Hyundai',
		model: 'Creta',
		body_type: 'suv',
		transmission: 'automatic',
		fuel_type: 'diesel',
		seats: 5,
		price_per_day: 4000,
		image: '/images/cars/creta.jpg',
	},
]

// Каталог
exports.catalog = (req, res) => {
	// В будущем здесь будет фильтрация по req.query и запрос к БД
	res.render('cars/catalog', {
		title: 'Каталог автомобилей',
		currentPage: 'catalog',
		cars: mockCars,
		// Параметры фильтров можно передать пустыми
		filters: {
			brand: '',
			body_type: '',
			start_date: '',
			end_date: '',
		},
	})
}

// Детальная страница
exports.details = (req, res) => {
	const car = mockCars.find(c => c.id === parseInt(req.params.id))
	if (!car) {
		return res.status(404).render('errors/404', { currentPage: '' })
	}
	res.render('cars/details', {
		title: `${car.brand} ${car.model}`,
		currentPage: 'catalog',
		car,
	})
}
