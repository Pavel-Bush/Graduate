const FineModel = require('../models/fineModel')

exports.showProfile = async (req, res) => {
	const fines = await FineModel.getByUserId(req.session.user.id)
	res.render('profile/profile', {
		title: 'Профиль',
		currentPage: 'profile',
		user: req.session.user,
		fines,
	})
}
