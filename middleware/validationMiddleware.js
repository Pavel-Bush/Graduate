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
		.withMessage('Имя должно содержать минимум 2 символа'),
	body('email')
		.isEmail()
		.withMessage('Введите корректный email')
		.normalizeEmail(),
	body('phone')
		.optional({ checkFalsy: true })
		.matches(/^\+?\d{7,15}$/)
		.withMessage(
			'Телефон должен содержать от 7 до 15 цифр, допускается + в начале',
		),
	body('password')
		.isLength({ min: 6 })
		.withMessage('Пароль должен быть минимум 6 символов'),
	body('driver_license_number').optional({ checkFalsy: true }).trim(),
]

exports.handleValidationErrors = handleValidationErrors
