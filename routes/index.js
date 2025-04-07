const express = require('express');
const router = express.Router();

const guestRoutes = require('./guestRoutes');
const adminRoutes = require('./adminRoutes');
const ownerRoutes = require('./ownerRoutes');
const bookingRoutes = require('./bookingRoutes');
const roomRoutes = require('./roomRoutes');
const discountRoutes = require('./discountRoutes');
const reviewRoutes = require('./reviewRoutes');
const favoriteRoutes = require('./favoriteRoutes');

router.use('/guest', guestRoutes);
router.use('/admin', adminRoutes);
router.use('/owner', ownerRoutes);
router.use('/booking', bookingRoutes);
router.use('/room', roomRoutes);
router.use('/discount', discountRoutes);
router.use('/reviews', reviewRoutes);
router.use('/favorite', favoriteRoutes);


module.exports = router;
