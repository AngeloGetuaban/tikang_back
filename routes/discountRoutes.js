const express = require('express');
const router = express.Router();
const discountsController = require('../controllers/discountsController'); // ✅ Must be correct


router.get('/', discountsController.getAllDiscounts);

module.exports = router;