const express = require('express')
const router = express.Router()
const rentalsController = require('../controllers/rentalsController')
const paymentController = require('../controllers/paymentController')
const authMiddleware = require('../middleware/authMiddleware')

router.get('/active', authMiddleware, rentalsController.showActiveRentals)
router.get('/history', authMiddleware, rentalsController.showHistory)
router.get('/create', authMiddleware, rentalsController.showCreateForm)
router.post('/create', authMiddleware, rentalsController.createRental)
router.post('/cancel/:id', authMiddleware, rentalsController.cancelRental)
router.get('/:id/services', authMiddleware, rentalsController.showServices)
router.post('/:id/services', authMiddleware, rentalsController.saveServices)
router.get('/:id/extend', authMiddleware, rentalsController.showExtendForm)
router.post('/:id/extend', authMiddleware, rentalsController.extendRental)

router.post('/payments', authMiddleware, paymentController.processPayment)
router.get('/:id/pay', authMiddleware, paymentController.showPaymentForm) // оплата основной
router.get(
	'/:id/pay-services',
	authMiddleware,
	paymentController.showPayServices,
)
router.get('/:id/pay-fines', authMiddleware, paymentController.showPayFines)

module.exports = router
