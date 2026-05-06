const { CartItem, MenuItem, Restaurant, sequelize } = require('../models');

// 1. GET /api/cart
exports.getCart = async (req, res) => {
  try {
    const cartItems = await CartItem.findAll({
      where: { user_id: req.user.id },
      include: [{ model: MenuItem, attributes: ['id', 'name', 'price', 'restaurant_id'] }]
    });
    res.status(200).json({ status: 'success', results: cartItems.length, data: cartItems });
  } catch (error) {
    res.status(500).json({ status: 'fail', message: error.message });
  }
};

// 2. POST /api/cart (SURGICAL FIX VERSION)
exports.addToCart = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { menu_item_id, quantity } = req.body;

    // Strict Number Validation
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty <= 0 || qty > 100) {
      const err = new Error('Invalid quantity (must be integer between 1 and 100)');
      err.statusCode = 400;
      throw err;
    }

    if (!menu_item_id) {
      const err = new Error('menu_item_id is required');
      err.statusCode = 400;
      throw err;
    }

    // Fetch MenuItem AND ensure its Restaurant is active
    const menuItem = await MenuItem.findByPk(menu_item_id, {
      include: [{ model: Restaurant, attributes: ['is_active'] }],
      transaction: t
    });

    if (!menuItem || !menuItem.is_available) {
      const err = new Error('Menu item not found or unavailable');
      err.statusCode = 404;
      throw err;
    }

    if (!menuItem.Restaurant.is_active) {
      const err = new Error('This restaurant is currently closed or inactive');
      err.statusCode = 400;
      throw err;
    }

    // Consistency check: Only 1 restaurant per cart
    const existingCartItem = await CartItem.findOne({
      where: { user_id: req.user.id },
      include: [{ model: MenuItem, attributes: ['restaurant_id'] }],
      transaction: t
    });

    if (existingCartItem) {
      if (menuItem.restaurant_id !== existingCartItem.MenuItem.restaurant_id) {
        const err = new Error('Cannot mix items from different restaurants. Clear cart first.');
        err.statusCode = 400;
        throw err;
      }
    }

    let cartItem = await CartItem.findOne({ where: { user_id: req.user.id, menu_item_id }, transaction: t });

    if (cartItem) {
      cartItem.quantity += qty;
      if (cartItem.quantity > 100) {
        const err = new Error('Total quantity exceeds limit of 100');
        err.statusCode = 400;
        throw err;
      }
      await cartItem.save({ transaction: t });
    } else {
      // Race condition recovery
      try {
        cartItem = await CartItem.create({ user_id: req.user.id, menu_item_id, quantity: qty }, { transaction: t });
      } catch (createErr) {
        if (createErr.name === 'SequelizeUniqueConstraintError') {
          cartItem = await CartItem.findOne({ where: { user_id: req.user.id, menu_item_id }, transaction: t });
          cartItem.quantity += qty;
          if (cartItem.quantity > 100) {
            const err = new Error('Total quantity exceeds limit of 100');
            err.statusCode = 400;
            throw err;
          }
          await cartItem.save({ transaction: t });
        } else {
          throw createErr;
        }
      }
    }

    await t.commit();
    res.status(200).json({ status: 'success', data: cartItem });

  } catch (error) {
    await t.rollback();

    // Clean Error Handling (400 vs 500)
    const statusCode = error.statusCode || 500;
    const message = statusCode === 500 ? 'Internal server error' : error.message;

    if (statusCode === 500) console.error('DB Error:', error);

    res.status(statusCode).json({ status: 'fail', message });
  }
};

// 3. PATCH /api/cart/:id
exports.updateCartItem = async (req, res) => {
  try {
    const { quantity } = req.body;

    if (quantity === undefined || quantity <= 0 || quantity > 100) {
      return res.status(400).json({ status: 'fail', message: 'Quantity must be between 1 and 100' });
    }

    const cartItem = await CartItem.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!cartItem) return res.status(404).json({ status: 'fail', message: 'Cart item not found' });

    cartItem.quantity = quantity;
    await cartItem.save();

    res.status(200).json({ status: 'success', data: cartItem });
  } catch (error) {
    res.status(500).json({ status: 'fail', message: error.message });
  }
};

// 4. DELETE /api/cart/:id
exports.removeFromCart = async (req, res) => {
  try {
    const deletedCount = await CartItem.destroy({ where: { id: req.params.id, user_id: req.user.id } });
    if (deletedCount === 0) return res.status(404).json({ status: 'fail', message: 'Cart item not found' });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ status: 'fail', message: error.message });
  }
};
