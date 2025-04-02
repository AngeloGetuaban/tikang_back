const express = require('express');
const router = express.Router();
const { getAllUsers, getUsersByType, getUserById, createUser, updateUser, deleteUser } = require('../controllers/usersController');

router.get('/users', getAllUsers);
router.get('/users/type/:type', getUsersByType);
router.get('/users/:id', getUserById);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
module.exports = router;
