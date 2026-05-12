// backend/routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// 1. POST /api/orders (Create Order from Cart) - Customer Only
router.post('/', protect, orderController.createOrder);

// 2. GET /api/orders (Get User Orders with Pagination) - All Authenticated Users
router.get('/', protect, orderController.getUserOrders);

// 3. GET /api/orders/:id (View Single Order) - Role-based Access
router.get('/:id', protect, orderController.getOrderById);

// 4. PUT /api/orders/:id/status (Admin/Owner/Driver updates status)
router.put('/:id/status', protect, restrictTo('admin', 'restaurant_owner', 'driver'), orderController.updateOrderStatus);

// 5. PUT /api/orders/:id/assign-driver (Driver assigns themselves)
router.put('/:id/assign-driver', protect, restrictTo('driver'), orderController.assignDriver);

// 6. PUT /api/orders/:id/complete-delivery (Driver completes delivery)
router.put('/:id/complete-delivery', protect, restrictTo('driver'), orderController.completeDelivery);

module.exports = router;

module.exports = router;
