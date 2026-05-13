exports.showProfile = (req, res) => {
	res.render('profile/profile', {
		title: 'Профиль',
		currentPage: 'profile',
		user: req.session.user,
	})
}
