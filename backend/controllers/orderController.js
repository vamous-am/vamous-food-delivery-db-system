const { Order, OrderItem, OrderStatusHistory, CartItem, MenuItem, sequelize } = require('../models');

// POST /api/orders
exports.createOrder = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { delivery_address } = req.body;
    const user_id = req.user.id;

    if (!delivery_address) throw new Error('Delivery address is required');

    // 1. Fetch Cart Items directly from DB (The Single Source of Truth)
    const cartItems = await CartItem.findAll({
      where: { user_id },
      include: [{ model: MenuItem }]
    });

    if (cartItems.length === 0) throw new Error('Your cart is empty');

    // 2. Extract Restaurant ID (Since we enforced consistency, all items belong to same restaurant)
    const restaurant_id = cartItems[0].MenuItem.restaurant_id;

    // 3. Calculate Subtotal & Prepare Order Items
    let subtotal = 0;
    const orderItemsData = [];

    for (let item of cartItems) {
      if (!item.MenuItem.is_available) {
        throw new Error(`${item.MenuItem.name} is no longer available. Please remove it from your cart.`);
      }

      subtotal += parseFloat(item.MenuItem.price) * item.quantity;

      orderItemsData.push({
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        price: item.MenuItem.price // Snapshot price!
      });
    }

    // 4. Calculate Total
    const delivery_fee = 50.00; // As requested
    const total_price = subtotal + delivery_fee;

    // 5. Create Order
    const order = await Order.create({
      user_id,
      restaurant_id,
      total_price,
      delivery_address,
      status: 'PENDING'
    }, { transaction: t });

    // 6. Create Order Items
    const mappedOrderItems = orderItemsData.map(item => ({ ...item, order_id: order.id }));
    await OrderItem.bulkCreate(mappedOrderItems, { transaction: t });

    // 7. Status History
    await OrderStatusHistory.create({ order_id: order.id, status: 'PENDING' }, { transaction: t });

    // 8. CLEAR THE CART! (Atomic: If order succeeds, cart is emptied)
    await CartItem.destroy({ where: { user_id }, transaction: t });

    await t.commit();
    res.status(201).json({ status: 'success', data: order });

  } catch (error) {
    await t.rollback();
    res.status(400).json({ status: 'fail', message: error.message });
  }
};
