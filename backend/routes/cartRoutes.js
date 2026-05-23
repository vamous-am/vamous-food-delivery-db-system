const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { schemas } = require('../middleware/schemas');

router.get('/',     protect, cartController.getCart);
router.post('/',    protect, validate(schemas.cart.addItem),    cartController.addItem);
router.patch('/:id',protect, validate(schemas.cart.updateItem), cartController.updateItem);
router.delete('/:id',protect, cartController.removeItem);

module.exports = router;
