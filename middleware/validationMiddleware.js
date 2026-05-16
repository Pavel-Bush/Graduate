const { body, validationResult } = require('express-validator')

// Обработчик ошибок валидации
const handleValidationErrors = (req, res, next) => {
	const errors = validationResult(req)
	if (!errors.isEmpty()) {
		// Для формы передаём ошибки и введённые данные
		return res
			.status(422)
			.render(req.path.includes('login') ? 'auth/login' : 'auth/register', {
				title: req.path.includes('login') ? 'Вход' : 'Регистрация',
				currentPage: req.path.includes('login') ? 'login' : 'register',
				errors: errors.array(),
				formData: req.body,
			})
	}
	next()
}

// Правила для входа
exports.loginRules = [
	body('email')
		.isEmail()
		.withMessage('Введите корректный email')
		.normalizeEmail(),
	body('password').notEmpty().withMessage('Пароль обязателен'),
]

// Правила для регистрации
exports.registerRules = [
	body('full_name')
		.trim()
		.isLength({ min: 2 })
		.withMessage('Имя должно содержать минимум 2 символа')
		.matches(/^[A-Za-zА-ЯЁа-яё\s\-'.]+$/)
		.withMessage(
			'ФИО может содержать только буквы, пробелы, дефисы и апострофы',
		),
	body('email')
		.isEmail()
		.withMessage('Введите корректный email')
		.normalizeEmail(),
	body('phone')
		.optional({ checkFalsy: true })
		.matches(/^(\+375|80)\d{9}$/)
		.withMessage(
			'Телефон должен быть в формате +375XXXXXXXXX или 80XXXXXXXXX (9 цифр после кода)',
		),
	body('password')
		.isLength({ min: 6 })
		.withMessage('Пароль должен быть минимум 6 символов'),
	body('driver_license_number')
		.optional({ checkFalsy: true })
		.trim()
		.matches(/^\d[А-ЯЁа-яё]{2}\d{6}$/i)
		.withMessage(
			'Номер ВУ должен состоять из 1 цифры, 2 букв и 6 цифр (пример: 1АА123456)',
		),
	body('license_issue_date')
		.optional({ checkFalsy: true })
		.isISO8601()
		.withMessage('Некорректная дата выдачи ВУ'),
]

exports.handleValidationErrors = handleValidationErrors
