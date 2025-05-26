const express = require('express');
const router = express.Router();
const ownerController = require('../controllers/ownerController');

router.post('/login', ownerController.ownerLogin);
router.post('/register', ownerController.ownerRegister);
router.get('/me', ownerController.getCurrentOwner);
router.get('/bookings/lessor/:lessorId', ownerController.getBookingsByLessor);
router.get('/properties/lessor/:lessorId', ownerController.getPropertiesWithRooms);
router.post(
    '/add-property',
    ownerController.uploadPropertyImages, // multer middleware
    ownerController.addProperty           // controller logic
  );

router.post('/switch-status/:propertyId', ownerController.switchPropertyStatus);
router.post('/add-room/:propertyId', ownerController.uploadRoomImages, ownerController.addRoom);
router.post('/switch-room-status/:roomId', ownerController.switchRoomStatus);
router.put(
    '/update-property/:propertyId',
    ownerController.uploadPropertyImages,
    ownerController.updateProperty
  );
router.delete('/delete-property/:propertyId', ownerController.deleteProperty);
router.put(
    '/update-room/:roomId',
    ownerController.uploadRoomImages,
    ownerController.updateRoom
  );
router.delete('/delete-room/:roomId', ownerController.deleteRoom);
router.get('/full-booking-info/:lessorId', ownerController.getAssociatedBookingsUsersPropertiesRooms);
router.post('/register-owner', ownerController.registerOwner);
module.exports = router;