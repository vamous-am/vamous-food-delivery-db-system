const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

const validate = require('../middleware/validate');
const { schemas } = require('../middleware/schemas');

router.post('/create-intent', protect, paymentController.createPaymentIntent);
router.post('/simulate/:orderId', protect, validate(schemas.payment.simulate), paymentController.simulatePayment);

module.exports = router;
