const express = require('express');
const router = express.Router();
const ownerController = require('../controllers/ownerController');

router.post('/login', ownerController.ownerLogin);
router.post('/register', ownerController.ownerRegister);

module.exports = router;