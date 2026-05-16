const UserModel = require('../models/userModel')
const passwordUtils = require('../utils/passwordUtils')

exports.showLogin = (req, res) => {
	res.render('auth/login', {
		title: 'Вход',
		currentPage: 'login',
		errors: [],
		formData: {},
	})
}

exports.login = async (req, res) => {
	try {
		const { email, password } = req.body
		const user = await UserModel.findByEmail(email)
		if (!user) {
			return res.render('auth/login', {
				title: 'Вход',
				currentPage: 'login',
				errors: [{ msg: 'Неверный email или пароль' }],
				formData: req.body,
			})
		}

		// Проверка пароля
		let isValid = false
		if (user.password_hash && user.password_hash.startsWith('$2b$')) {
			isValid = await passwordUtils.compare(password, user.password_hash)
		} else {
			// Временный открытый пароль — разрешаем и обновляем хэш
			if (password === user.password_hash) {
				const hashed = await passwordUtils.hash(password)
				await UserModel.updatePasswordHash(user.user_id, hashed)
				isValid = true
			}
		}

		if (!isValid) {
			return res.render('auth/login', {
				title: 'Вход',
				currentPage: 'login',
				errors: [{ msg: 'Неверный email или пароль' }],
				formData: req.body,
			})
		}

		// Блокировка
		if (user.is_blocked) {
			return res.render('auth/login', {
				title: 'Вход',
				currentPage: 'login',
				errors: [{ msg: 'Ваш аккаунт заблокирован' }],
				formData: req.body,
			})
		}

		req.session.user = {
			id: user.user_id,
			full_name: user.full_name,
			email: user.email,
			role: user.role,
		}

		const returnTo = req.session.returnTo || '/cars'
		delete req.session.returnTo
		res.redirect(returnTo)
	} catch (error) {
		console.error(error)
		res.status(500).render('errors/500', { currentPage: '' })
	}
}

exports.logout = (req, res) => {
	req.session.destroy(() => res.redirect('/'))
}

exports.showRegister = (req, res) => {
	res.render('auth/register', {
		title: 'Регистрация',
		currentPage: 'register',
		errors: [],
		formData: {},
	})
}

exports.register = async (req, res) => {
	try {
		const {
			full_name,
			email,
			phone,
			password,
			driver_license_number,
			license_issue_date,
		} = req.body
		const driver_license_upper = driver_license_number
			? driver_license_number.toUpperCase()
			: null

		// Проверка уникальности email
		const existing = await UserModel.findByEmail(email)
		if (existing) {
			return res.render('auth/register', {
				title: 'Регистрация',
				currentPage: 'register',
				errors: [{ msg: 'Пользователь с таким email уже существует' }],
				formData: req.body,
			})
		}

		const hashed = await passwordUtils.hash(password)
		const userId = await UserModel.create({
			full_name,
			email,
			phone: phone || null,
			password_hash: hashed,
			driver_license_number: driver_license_upper,
			license_issue_date: license_issue_date || null,
			license_categories: JSON.stringify(['B']),
		})

		req.session.user = {
			id: userId,
			full_name,
			email,
			role: 'client',
		}
		res.redirect('/cars')
	} catch (error) {
		console.error(error)
		res.status(500).render('errors/500', { currentPage: '' })
	}
}
