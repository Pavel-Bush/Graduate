// Моковые пользователи (пароли открыты для простоты)
const users = [
	{
		id: 1,
		full_name: 'Клиент Иванов',
		email: 'client@test.ru',
		password: '123456',
		role: 'client',
	},
	{
		id: 2,
		full_name: 'Сотрудник Петров',
		email: 'employee@test.ru',
		password: '123456',
		role: 'employee',
	},
	{
		id: 3,
		full_name: 'Админ Сидоров',
		email: 'admin@test.ru',
		password: '123456',
		role: 'admin',
	},
]

exports.showLogin = (req, res) => {
	res.render('auth/login', {
		title: 'Вход',
		currentPage: 'login',
		errors: [],
		formData: {},
	})
}

exports.login = (req, res) => {
	const { email, password } = req.body
	const user = users.find(u => u.email === email && u.password === password)
	if (!user) {
		return res.render('auth/login', {
			title: 'Вход',
			currentPage: 'login',
			errors: [{ msg: 'Неверный email или пароль' }],
			formData: req.body,
		})
	}
	req.session.user = {
		id: user.id,
		full_name: user.full_name,
		email: user.email,
		role: user.role,
	}
	const returnTo = req.session.returnTo || '/cars'
	delete req.session.returnTo
	res.redirect(returnTo)
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

exports.register = (req, res) => {
	const { full_name, email, phone, password, driver_license_number } = req.body
	// Проверка уникальности email (мок)
	if (users.find(u => u.email === email)) {
		return res.render('auth/register', {
			title: 'Регистрация',
			currentPage: 'register',
			errors: [{ msg: 'Пользователь с таким email уже существует' }],
			formData: req.body,
		})
	}
	// В реальности здесь будет запись в БД; пока просто логиним
	req.session.user = {
		id: users.length + 1,
		full_name,
		email,
		role: 'client',
	}
	res.redirect('/cars')
}
