const CardModel = require('../models/cardModel')
const FineModel = require('../models/fineModel')

exports.showProfile = async (req, res) => {
	const fines = await FineModel.getByUserId(req.session.user.id)
	const cards = await CardModel.getUserCards(req.session.user.id)
	res.render('profile/profile', {
		title: 'Профиль',
		currentPage: 'profile',
		user: req.session.user,
		fines,
		cards,
		errors: [],
		success: null,
	})
}

exports.addCard = async (req, res) => {
	try {
		const { card_number, expiry_month, expiry_year, cvv } = req.body
		const errors = []

		// Валидация номера карты
		if (!card_number || !/^\d{16}$/.test(card_number.replace(/\s/g, ''))) {
			errors.push({ msg: 'Номер карты должен содержать 16 цифр' })
		}

		// Валидация срока
		const month = parseInt(expiry_month)
		const year = parseInt(expiry_year)
		const currentYear = new Date().getFullYear()
		const currentMonth = new Date().getMonth() + 1

		if (!month || month < 1 || month > 12) {
			errors.push({ msg: 'Месяц должен быть от 01 до 12' })
		}
		if (
			!year ||
			year < currentYear ||
			(year === currentYear && month < currentMonth)
		) {
			errors.push({ msg: 'Срок действия карты истёк или некорректен' })
		}

		// Валидация CVV
		if (!cvv || !/^\d{3}$/.test(cvv)) {
			errors.push({ msg: 'CVV должен содержать 3 цифры' })
		}

		if (errors.length > 0) {
			const fines = await FineModel.getByUserId(req.session.user.id)
			const cards = await CardModel.getUserCards(req.session.user.id)
			return res.render('profile/profile', {
				title: 'Профиль',
				currentPage: 'profile',
				user: req.session.user,
				fines,
				cards,
				errors,
				success: null,
			})
		}

		// Передаём только номер, остальное не храним
		await CardModel.addCard(req.session.user.id, card_number.replace(/\s/g, ''))
		res.redirect('/profile')
	} catch (error) {
		console.error(error)
		res.status(500).render('errors/500', { currentPage: '' })
	}
}

exports.deleteCard = async (req, res) => {
	try {
		await CardModel.deleteCard(req.params.id, req.session.user.id)
		res.redirect('/profile')
	} catch (error) {
		console.error(error)
		res.status(500).render('errors/500', { currentPage: '' })
	}
}

exports.setDefaultCard = async (req, res) => {
	try {
		await CardModel.setDefault(req.params.id, req.session.user.id)
		res.redirect('/profile')
	} catch (error) {
		console.error(error)
		res.status(500).render('errors/500', { currentPage: '' })
	}
}
