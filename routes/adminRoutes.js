const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const verifyToken = require('../middleware/authMiddleware');
const { getAllUsers, getUsersByType, getUserById, createUser, updateUser, deleteUser } = require('../controllers/usersController');

// Check if the user is an admin
const checkAdmin = (req, res, next) => {
    if (req.user.userType !== 'admin') {
        return res.status(403).json({ message: 'Access denied: Admins only' });
    }
    next();
};

router.post('/register', adminController.adminRegister); // Admin creation
router.post('/login', adminController.adminLogin);       // Admin login
router.get('/users', verifyToken, checkAdmin, adminController.getActiveUsers); // Protected

router.get('/users/type/:type', getUsersByType);
router.get('/users/:id', getUserById);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
module.exports = router;
