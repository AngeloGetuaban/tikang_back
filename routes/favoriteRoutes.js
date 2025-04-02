const express = require('express');
const router = express.Router();
const favoritesController = require('../controllers/favoritesController');

router.get('/favorites', favoritesController.getAllFavorites);
router.get('/favorites/:id', favoritesController.getFavoriteById);
router.post('/favorites', favoritesController.createFavorite);
router.put('/favorites/:id', favoritesController.updateFavorite);
router.delete('/favorites/:id', favoritesController.deleteFavorite);

module.exports = router;
