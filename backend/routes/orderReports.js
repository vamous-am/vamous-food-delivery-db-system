const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  cancelOrder,
  getOrderTimeline,
  getRestaurantReport,
  getDriverReport,
  getLowStockWarnings,
} = require('../controllers/orderReportsController');

router.patch('/:id/cancel', authenticate, cancelOrder);
router.get('/:id/timeline', authenticate, getOrderTimeline);
router.get('/reports/restaurant', authenticate, getRestaurantReport);
router.get('/reports/driver', authenticate, getDriverReport);
router.get('/stock-warnings', authenticate, getLowStockWarnings);

module.exports = router;
