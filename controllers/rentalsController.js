// Заглушка: список активных аренд
exports.showActiveRentals = (req, res) => {
	res.render('rentals/active', {
		title: 'Мои аренды',
		currentPage: 'rentals',
		rentals: [], // пока пусто
	})
}
