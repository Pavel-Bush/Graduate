const express = require('express')
const router = express.Router()
const carsController = require('../controllers/carsController')

router.get('/', carsController.catalog)
router.get('/:id', carsController.details)

module.exports = router
