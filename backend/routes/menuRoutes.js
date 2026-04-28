const express = require('express');
const router = express.Router();
const restaurantController = require('../controllers/restaurantController');

// Mounted to /api/menu-items automatically
router.get('/:id', restaurantController.getMenuItemById);

module.exports = router;
