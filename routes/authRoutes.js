const express = require('express')
const router = express.Router()
const authController = require('../controllers/authController')
const {
	loginRules,
	registerRules,
	handleValidationErrors,
} = require('../middleware/validationMiddleware')

router.get('/login', authController.showLogin)
router.post('/login', loginRules, handleValidationErrors, authController.login)
router.get('/logout', authController.logout)
router.get('/register', authController.showRegister)
router.post(
	'/register',
	registerRules,
	handleValidationErrors,
	authController.register,
)

module.exports = router
