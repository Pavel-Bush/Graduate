const express = require('express')
const router = express.Router()
const rentalsController = require('../controllers/rentalsController')
const authMiddleware = require('../middleware/authMiddleware')

router.get('/active', authMiddleware, rentalsController.showActiveRentals)
// POST /create будет позже

module.exports = router
