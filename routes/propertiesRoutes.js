const express = require('express');
const router = express.Router();
const {
  getAllProperties
} = require('../controllers/propertiesController');

router.get('/', getAllProperties);

module.exports = router;
