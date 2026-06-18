// backend/routes/menuRoutes.js
// Mounted at /api/menu-items
//
// IMPORTANT: specific routes must come before /:id wildcard routes.
// /categories/mine must be registered before /:id or Express will treat
// "categories" as an id parameter and route to getMenuItemById.

const express              = require('express');
const router               = express.Router();
const restaurantController = require('../controllers/restaurantController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// ── Owner only — specific paths first ────────────────────────────────────────
// GET /api/menu-items/categories/mine — fetch categories for the owner's restaurant
router.get('/categories/mine',
  protect,
  restrictTo('restaurant_owner'),
  restaurantController.getMenuCategories,
);

// POST /api/menu-items/categories — create a new category
router.post('/categories',
  protect,
  restrictTo('restaurant_owner'),
  restaurantController.createCategory,
);

// POST /api/menu-items — create a new menu item
router.post('/',
  protect,
  restrictTo('restaurant_owner'),
  restaurantController.createMenuItem,
);

// ── Public — wildcard last ────────────────────────────────────────────────────
router.get('/:id', restaurantController.getMenuItemById);

// ── Owner / Admin only ────────────────────────────────────────────────────────
router.put('/:id',
  protect,
  restrictTo('restaurant_owner', 'admin'),
  restaurantController.updateMenuItem,
);

module.exports = router;
