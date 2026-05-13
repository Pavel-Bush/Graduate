// Проверяет, что пользователь авторизован
module.exports = (req, res, next) => {
	if (req.session.user) {
		return next()
	}
	// Сохраняем изначальный URL для редиректа после входа
	req.session.returnTo = req.originalUrl
	res.redirect('/auth/login')
}
