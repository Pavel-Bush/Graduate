const express = require('express')
const router = express.Router()
const adminController = require('../controllers/adminController')
const authMiddleware = require('../middleware/authMiddleware')
const roleMiddleware = require('../middleware/roleMiddleware')

// Сотрудник и админ могут видеть админ-панель
router.get(
	'/',
	authMiddleware,
	roleMiddleware('employee', 'admin'),
	adminController.showDashboard,
)

module.exports = router
