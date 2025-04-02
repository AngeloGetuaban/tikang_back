const express = require('express');
const router = express.Router();
const { getUsersByType } = require('../controllers/usersController');

router.get('/users', (req, res) => {
  req.params.type = 'guest';
  getUsersByType(req, res);
});

module.exports = router;
