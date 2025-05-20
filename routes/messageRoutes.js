const express = require('express');
const router = express.Router();
const { getUserConversations } = require('../controllers/messagingController');

router.get('/:userId/conversations', getUserConversations);

module.exports = router;