// backend/routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const reviewController = require('../controllers/reviewController');
const { protect, restrictTo } = require('../middleware/authMiddleware'); 
const validate = require('../middleware/validate');
const { schemas } = require('../middleware/schemas');

// Customer creates order 
router.post('/', protect, validate(schemas.order.create), orderController.createOrder);

// Get Order History (Phase 1)
router.get('/', protect, orderController.getUserOrders);

// Dedicated Stats route for the Dashboard (Must be above /:id)
router.get('/admin/stats', protect, restrictTo('admin', 'restaurant_owner'), orderController.getAdminStats);

// Get Single Order (Phase 2)
router.get('/:id', protect, orderController.getOrderById);

// Admin/Owner updates status (Phase 4)
router.put('/:id/status', protect, restrictTo('admin', 'restaurant_owner', 'driver'), validate(schemas.order.updateStatus), orderController.updateOrderStatus);
// Driver specific actions (Day 8)
router.put('/:id/assign-driver', protect, restrictTo('driver'), orderController.assignDriver);
router.put('/:id/complete-delivery', protect, restrictTo('driver'), orderController.completeDelivery);

router.post('/:id/reviews', protect, restrictTo('customer'), validate(schemas.review.create), reviewController.addReview);

module.exports = router;
