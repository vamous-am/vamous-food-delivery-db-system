const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { protect } = require('../middleware/authMiddleware'); // ALL PROTECTED

router.post('/', protect, cartController.addToCart);
router.get('/', protect, cartController.getCart);
router.patch('/:id', protect, cartController.updateCartItem);
router.delete('/:id', protect, cartController.removeFromCart);

module.exports = router;
