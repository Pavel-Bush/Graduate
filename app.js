require('dotenv').config()
const express = require('express')
const session = require('express-session')
const path = require('path')

// Импорт маршрутов (позже заполним)
const authRoutes = require('./routes/authRoutes')
const rentalsRoutes = require('./routes/rentalsRoutes')
const paymentRoutes = require('./routes/paymentRoutes')
const carsRoutes = require('./routes/carsRoutes')
const adminRoutes = require('./routes/adminRoutes')
const profileRoutes = require('./routes/profileRoutes')

const app = express()

// Сессии
app.use(
	session({
		secret: process.env.SESSION_SECRET,
		resave: false,
		saveUninitialized: false,
		cookie: {
			httpOnly: true,
			maxAge: 24 * 60 * 60 * 1000, // 24 часа
		},
	}),
)

// Глобальные переменные для шаблонов
app.use((req, res, next) => {
	res.locals.user = req.session.user || null
	res.locals.currentPage = ''
	next()
})

// Шаблонизатор
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))

// Статика
app.use(express.static(path.join(__dirname, 'public')))

// Парсинг тела запросов
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

// Роуты
app.use('/auth', authRoutes)
app.use('/rentals', rentalsRoutes)
app.use('/payments', paymentRoutes)
app.use('/cars', carsRoutes)
app.use('/admin', adminRoutes)
app.use('/profile', profileRoutes)

// Главная страница
app.get('/', (req, res) => {
	res.redirect('/cars')
})

// Обработка 404
app.use((req, res) => {
	res.status(404).render('errors/404', { currentPage: '' })
})

// Обработка ошибок
app.use((err, req, res, next) => {
	console.error(err.stack)
	res.status(500).render('errors/500', { currentPage: '' })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
	console.log(`Сервер запущен на порту ${PORT}`)
})
