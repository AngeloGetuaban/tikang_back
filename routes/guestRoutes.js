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
router.post('/logout', guestController.guestLogout);
router.get('/me', guestController.getCurrentGuest);
router.get('/reviews', guestController.getGuestReviews);
router.patch('/update-name', guestController.updateGuestName);
router.patch('/update-phone', guestController.updateGuestPhone);
router.patch('/update-email', guestController.updateGuestEmail);
module.exports = router;
