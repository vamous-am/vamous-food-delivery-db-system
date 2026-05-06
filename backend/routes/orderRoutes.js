const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware'); // ALL PROTECTED

router.post('/', protect, orderController.createOrder);

module.exports = router;
