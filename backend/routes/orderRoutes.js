const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect, restrictTo } = require('../middleware/authMiddleware'); 

router.post('/', protect, orderController.createOrder);
router.get('/:id', protect, orderController.getOrderById);
router.put('/:id/status', protect, restrictTo('admin', 'restaurant_owner', 'driver'), orderController.updateOrderStatus);

module.exports = router;
