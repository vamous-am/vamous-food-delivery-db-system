const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

router.post('/create-intent', protect, paymentController.createPaymentIntent);
router.post('/simulate/:orderId', protect, paymentController.simulatePayment);

module.exports = router;
