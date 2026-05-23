const express = require('express');
const router = express.Router();
const restaurantController = require('../controllers/restaurantController');
const reviewController = require('../controllers/reviewController'); 
const { protect, restrictTo } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { schemas } = require('../middleware/schemas');

// Restaurant Endpoints
router.get('/',            restaurantController.getRestaurants);     
router.get('/:id',         restaurantController.getRestaurantById);  
router.get('/:id/menu',    restaurantController.getMenu);            
router.get('/:id/reviews', reviewController.getRestaurantReviews);   

// Owner-only menu management
router.post('/menu',     protect, restrictTo('restaurant_owner', 'admin'), validate(schemas.restaurant.addMenuItem),    restaurantController.addMenuItem);
router.put('/menu/:id',  protect, restrictTo('restaurant_owner', 'admin'), validate(schemas.restaurant.updateMenuItem), restaurantController.updateMenuItem);
router.delete('/menu/:id', protect, restrictTo('restaurant_owner', 'admin'), restaurantController.softDeleteMenuItem); 

module.exports = router;
