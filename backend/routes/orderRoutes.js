const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect, restrictTo } = require('../middleware/authMiddleware'); 

// Customer creates order
router.post('/', protect, orderController.createOrder);

// Get order history with pagination
router.get('/', protect, orderController.getMyOrders);

// Admin/Owner updates status (PREPARING, READY, etc)
router.put('/:id/status', protect, restrictTo('admin', 'restaurant_owner', 'driver'), orderController.updateOrderStatus);

// Driver specific actions
router.put('/:id/assign-driver', protect, restrictTo('driver'), orderController.assignDriver);
router.put('/:id/complete-delivery', protect, restrictTo('driver'), orderController.completeDelivery);

module.exports = router;
