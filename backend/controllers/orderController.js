const { Order, OrderItem, OrderStatusHistory, CartItem, MenuItem, Driver, sequelize } = require('../models');
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
  const { id } = req.params;
  let { status } = req.body; 

  // 1. VALIDATE FIRST (Before opening transaction!)
  if (!id || isNaN(id)) {
    return res.status(400).json({ status: 'fail', message: 'Invalid order ID format', data: null });
  }
  if (!status) {
    return res.status(400).json({ status: 'fail', message: 'New status is required' });
  }

  status = status.toUpperCase(); 

  // 2. NOW OPEN THE TRANSACTION
  const t = await sequelize.transaction();

  try {
    const order = await Order.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });

    if (!order) {
      await t.rollback();
      return res.status(404).json({ status: 'fail', message: 'Order not found' });
    }

    if (req.user.role === 'driver') {
      const { Driver } = require('../models');
      const driverProfile = await Driver.findOne({ where: { user_id: req.user.id }, transaction: t });
      if (!driverProfile || order.driver_id !== driverProfile.id) {
        await t.rollback();
        return res.status(403).json({ status: 'fail', message: 'Access denied: You are not assigned to this order' });
      }
    }

    if (!canTransition(order.status, status)) {
      await t.rollback();
      return res.status(400).json({ status: 'fail', message: `Invalid transition! Cannot move order from ${order.status} to ${status}.` });
    }

    order.status = status;
    await order.save({ transaction: t });

    const { OrderStatusHistory } = require('../models');
    await OrderStatusHistory.create({ order_id: order.id, status: status }, { transaction: t });

    await t.commit();
    res.status(200).json({ status: 'success', message: `Order status updated to ${status}`, data: order });

  } catch (error) {
    await t.rollback();
    res.status(500).json({ status: 'fail', message: error.message });
  }
};

// GET /api/orders/:id (View single order)
exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || isNaN(id)) {
      return res.status(400).json({ status: 'fail', message: 'Invalid order ID format' });
    }

    const whereClause = { id };
    
    // Security: Customers only see their own orders!
    if (req.user.role === 'customer') {
      whereClause.user_id = req.user.id;
    } else if (req.user.role === 'driver') {
      whereClause.driver_id = req.user.id;
    }

    const order = await Order.findOne({ where: whereClause });

    if (!order) {
      return res.status(404).json({ status: 'fail', message: 'Order not found' });
    }

    res.status(200).json({ status: 'success', data: order });
  } catch (error) {
    console.error("Get Order Error:", error);
    res.status(500).json({ status: 'fail', message: 'Internal server error' });
  }
};

// PUT /api/orders/:id/assign-driver
exports.assignDriver = async (req, res) => {
  const { id } = req.params;

  // 1. VALIDATE FIRST
  if (!id || isNaN(id)) {
    return res.status(400).json({ status: 'fail', message: 'Invalid order ID format', data: null });
  }

  const t = await sequelize.transaction();
  try {
    const driver = await Driver.findOne({ where: { user_id: req.user.id }, transaction: t, lock: t.LOCK.UPDATE });
    if (!driver || !driver.is_active) {
      await t.rollback();
      return res.status(403).json({ status: 'fail', message: 'Active driver profile not found' });
    }

    const activeOrder = await Order.findOne({ where: { driver_id: driver.id, status: 'OUT_FOR_DELIVERY' }, transaction: t });
    if (activeOrder) {
      await t.rollback();
      return res.status(400).json({ status: 'fail', message: 'You already have an active delivery. Finish it first!' });
    }

    const order = await Order.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!order) {
      await t.rollback();
      return res.status(404).json({ status: 'fail', message: 'Order not found' });
    }

    if (order.status !== 'READY') {
      await t.rollback();
      return res.status(400).json({ status: 'fail', message: `Order is ${order.status}, not READY for pickup.` });
    }
    if (order.driver_id !== null) {
      await t.rollback();
      return res.status(400).json({ status: 'fail', message: 'Order has already been assigned to another driver.' });
    }

    order.driver_id = driver.id;
    order.status = 'OUT_FOR_DELIVERY'; 
    await order.save({ transaction: t });

    driver.is_available = false;
    await driver.save({ transaction: t });

    const { OrderStatusHistory } = require('../models');
    await OrderStatusHistory.create({ order_id: order.id, status: 'OUT_FOR_DELIVERY' }, { transaction: t });

    await t.commit();
    res.status(200).json({ status: 'success', message: 'Order assigned successfully', data: order });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ status: 'fail', message: error.message });
  }
};

// PUT /api/orders/:id/complete-delivery
exports.completeDelivery = async (req, res) => {
  const { id } = req.params;

  // 1. VALIDATE FIRST
  if (!id || isNaN(id)) {
    return res.status(400).json({ status: 'fail', message: 'Invalid order ID format', data: null });
  }

  const t = await sequelize.transaction();
  try {
    const driver = await Driver.findOne({ where: { user_id: req.user.id }, transaction: t, lock: t.LOCK.UPDATE });
    if (!driver || !driver.is_active) {
      await t.rollback();
      return res.status(403).json({ status: 'fail', message: 'Active driver profile not found' });
    }

    const order = await Order.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!order) {
      await t.rollback();
      return res.status(404).json({ status: 'fail', message: 'Order not found' });
    }

    if (order.driver_id !== driver.id) {
      await t.rollback();
      return res.status(403).json({ status: 'fail', message: 'You are not assigned to this order' });
    }
    if (order.status !== 'OUT_FOR_DELIVERY') {
      await t.rollback();
      return res.status(400).json({ status: 'fail', message: `Cannot complete delivery. Order is currently: ${order.status}` });
    }

    order.status = 'COMPLETED';
    await order.save({ transaction: t });

    driver.is_available = true;
    await driver.save({ transaction: t });

    const { OrderStatusHistory } = require('../models');
    await OrderStatusHistory.create({ order_id: order.id, status: 'COMPLETED' }, { transaction: t });

    await t.commit();
    res.status(200).json({ status: 'success', message: 'Delivery completed successfully!', data: order });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ status: 'fail', message: error.message });
  }
};
// GET /api/orders (Get Order History with Pagination!)
exports.getMyOrders = async (req, res) => {
  try {
    const { Restaurant } = require('../models');
    
    // Satisfying Critique 4: Pagination!
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    let whereClause = {};

    // Satisfying Role-based scoping
    if (req.user.role === 'customer') {
      whereClause.user_id = req.user.id;
    } else if (req.user.role === 'driver') {
      whereClause.driver_id = req.user.id;
    }
    // Admins see everything (whereClause stays empty)

    const orders = await Order.findAll({
      where: whereClause,
      include:[{ model: Restaurant, attributes: ['name', 'address'] }],
      order: [['createdAt', 'DESC']], // Newest orders first!
      limit,
      offset
    });

    // Satisfying Critique 3: Strict Response Contract
    res.status(200).json({ 
      status: 'success', 
      results: orders.length, 
      data: orders 
    });
  } catch (error) {
    res.status(500).json({ status: 'fail', message: error.message, data: null });
  }
};