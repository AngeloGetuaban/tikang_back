const express = require('express');
const router = express.Router();
const roomsController = require('../controllers/roomsController');

router.get('/', roomsController.getAllRooms);
module.exports = router;    