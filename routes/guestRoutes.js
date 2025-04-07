// routes/guestRoutes.js
const express = require('express');
const router = express.Router();
const guestController = require('../controllers/guestController');
const verifyToken = require('../middleware/authMiddleware');

router.post('/login', guestController.guestLogin);
router.post('/register', guestController.guestRegister); // 👈 Add this

router.get('/profile', verifyToken, (req, res) => {
  // Access req.user here (decoded from JWT)
  res.json({
      message: 'This is protected',
      user: req.user
  });
});

module.exports = router;
