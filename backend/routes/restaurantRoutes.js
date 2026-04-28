const express = require('express');
const router = express.Router();
const restaurantController = require('../controllers/restaurantController');

// Mounted to /api/restaurants automatically
router.get('/', restaurantController.getRestaurants);
router.get('/:id', restaurantController.getRestaurantById);
router.get('/:id/menu', restaurantController.getRestaurantMenu);

module.exports = router;
