// Принимает список разрешённых ролей
module.exports = (...roles) => {
	return (req, res, next) => {
		if (!req.session.user) {
			return res.redirect('/auth/login')
		}
		if (!roles.includes(req.session.user.role)) {
			return res.status(403).render('errors/403', { currentPage: '' })
		}
		next()
	}
}
