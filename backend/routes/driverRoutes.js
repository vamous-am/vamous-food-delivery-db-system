const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driverController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// Only drivers can view available orders
router.get('/available-orders', protect, restrictTo('driver'), driverController.getAvailableOrders);

module.exports = router;
