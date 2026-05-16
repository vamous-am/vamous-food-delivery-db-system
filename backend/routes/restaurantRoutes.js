// backend/routes/restaurantRoutes.js
const express = require('express');
const router = express.Router();
const restaurantController = require('../controllers/restaurantController');
const reviewController = require('../controllers/reviewController'); 

// Restaurant Endpoints
router.get('/', restaurantController.getRestaurants);
router.get('/:id', restaurantController.getRestaurantById);
router.get('/:id/menu', restaurantController.getRestaurantMenu);
router.get('/:id/reviews', reviewController.getRestaurantReviews);

module.exports = router;
