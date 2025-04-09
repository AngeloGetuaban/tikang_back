const express = require('express');
const router = express.Router();
const otpController = require('../controllers/otpController');

router.get('/verify-code', otpController.verifyEmailCode);
router.get('/send-code', otpController.sendEmailVerification);

module.exports = router;
