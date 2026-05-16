const express = require('express')
const router = express.Router()
const profileController = require('../controllers/profileController')
const authMiddleware = require('../middleware/authMiddleware')

router.get('/', authMiddleware, profileController.showProfile)

// Карты
router.post('/cards', authMiddleware, profileController.addCard)
router.post('/cards/:id/delete', authMiddleware, profileController.deleteCard)
router.post(
	'/cards/:id/default',
	authMiddleware,
	profileController.setDefaultCard,
)

module.exports = router
