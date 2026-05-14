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

router.get(
	'/rentals',
	authMiddleware,
	roleMiddleware('employee', 'admin'),
	adminController.showRentals,
)
router.post(
	'/rentals/:id/start',
	authMiddleware,
	roleMiddleware('employee', 'admin'),
	adminController.startRental,
)
router.post(
	'/rentals/:id/complete',
	authMiddleware,
	roleMiddleware('employee', 'admin'),
	adminController.completeRental,
)
router.get(
	'/fines',
	authMiddleware,
	roleMiddleware('employee', 'admin'),
	adminController.showFinesForm,
)
router.post(
	'/fines',
	authMiddleware,
	roleMiddleware('employee', 'admin'),
	adminController.createFine,
)
router.get(
	'/cash-payments',
	authMiddleware,
	roleMiddleware('employee', 'admin'),
	adminController.showPendingCashPayments,
)
router.post(
	'/cash-payments/:id/confirm',
	authMiddleware,
	roleMiddleware('employee', 'admin'),
	adminController.confirmCashPayment,
)

module.exports = router
