const { Order, OrderItem, OrderStatusHistory, CartItem, MenuItem, Restaurant, sequelize } = require('../models');
const { canTransition } = require('../services/orderStateMachine');

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
      include: [{ model: MenuItem }],
      transaction: t
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

// PUT /api/orders/:id/status
exports.updateOrderStatus = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { id } = req.params;
    let { status } = req.body;

    if (!status) {
      return res.status(400).json({ status: 'fail', message: 'New status is required' });
    }

    status = status.toUpperCase();

    // 1. Find the order and LOCK it
    const order = await Order.findByPk(id, {
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!order) {
      await t.rollback();
      return res.status(404).json({ status: 'fail', message: 'Order not found' });
    }

    // 👉 THE NEW REVIEWER FIX: Prevent Drivers from touching other drivers' orders
    if (req.user.role === 'driver') {
      const { Driver } = require('../models');
      const driverProfile = await Driver.findOne({ where: { user_id: req.user.id }, transaction: t });

      // If they have no driver profile, or they aren't assigned to THIS order, reject it!
      if (!driverProfile || order.driver_id !== driverProfile.id) {
        await t.rollback();
        return res.status(403).json({
          status: 'fail',
          message: 'Access denied: You are not assigned to this order'
        });
      }
    }

    // 2. Validate the transition using our State Machine
    if (!canTransition(order.status, status)) {
      await t.rollback();
      return res.status(400).json({
        status: 'fail',
        message: `Invalid transition! Cannot move order from ${order.status} to ${status}.`
      });
    }

    // 3. Update Order
    order.status = status;
    await order.save({ transaction: t });

    // 4. Log in History Table
    const { OrderStatusHistory: OSH } = require('../models');
    await OSH.create({
      order_id: order.id,
      status: status
    }, { transaction: t });

    await t.commit();
    res.status(200).json({ status: 'success', message: `Order status updated to ${status}`, data: order });

  } catch (error) {
    await t.rollback();
    res.status(500).json({ status: 'fail', message: error.message });
  }
};

// GET /api/orders/:id
exports.getOrderById = async (req, res) => {
  try {
    // 1. Base query looks for the specific order ID
    const whereClause = { id: req.params.id };

    // 2. SECURITY FIX: Role-Based Scoping (Prevent IDOR)
    if (req.user.role === 'customer') {
      // Customers can ONLY look up their own user_id
      whereClause.user_id = req.user.id;
    } else if (req.user.role === 'driver') {
      // Drivers can ONLY look up orders assigned to them
      const { Driver } = require('../models');
      const driverProfile = await Driver.findOne({ where: { user_id: req.user.id } });
      if (!driverProfile) {
        return res.status(404).json({ status: 'fail', message: 'Order not found or access denied' });
      }
      whereClause.driver_id = driverProfile.id;
    }
    // (Admins and Restaurant Owners bypass this and can view the order)

    // 3. Fetch the data securely
    const order = await Order.findOne({
      where: whereClause,
      include: [
        { model: OrderItem },
        { model: OrderStatusHistory },
        { model: Restaurant, attributes: ['name'] }
      ]
    });

    if (!order) {
      // Ambiguous error message is good for security (don't reveal if it exists or not)
      return res.status(404).json({ status: 'fail', message: 'Order not found or access denied' });
    }

    res.status(200).json({ status: 'success', data: order });
  } catch (error) {
    res.status(500).json({ status: 'fail', message: error.message });
  }
};
