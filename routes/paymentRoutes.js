const express = require('express')
const router = express.Router()
const paymentController = require('../controllers/paymentController')
const authMiddleware = require('../middleware/authMiddleware')

router.get('/:id', authMiddleware, paymentController.showPaymentForm)
router.post('/', authMiddleware, paymentController.processPayment)

module.exports = router
