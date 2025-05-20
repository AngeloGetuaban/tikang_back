const express = require('express');
const router = express.Router();
const {
  getAllUsersCash,
  getUserCash,
  updateUserCash,
  resetUserCash,
} = require('../controllers/cashController');

// GET all users' cash
router.get('/', getAllUsersCash);

// GET one user's cash
router.get('/:userId', getUserCash);

// PUT update a user's cash
router.put('/:userId', updateUserCash);

// DELETE (reset) a user's cash
router.delete('/:userId', resetUserCash);

module.exports = router;
