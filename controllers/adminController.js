exports.showDashboard = (req, res) => {
	res.render('admin/dashboard', {
		title: 'Админ-панель',
		currentPage: 'admin',
	})
}
