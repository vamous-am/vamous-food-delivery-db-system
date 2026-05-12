// backend/controllers/orderController.js
const { Order, OrderItem, OrderStatusHistory, CartItem, MenuItem, Restaurant, Driver, sequelize } = require('../models');
const { canTransition } = require('../services/orderStateMachine');
// 1. POST /api/orders (Create Order from Cart)
exports.createOrder = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { delivery_address } = req.body;
    const user_id = req.user.id; 
    if (!delivery_address) throw new Error('Delivery address is required');
    const cartItems = await CartItem.findAll({
      where: { user_id },
      include: [{ model: MenuItem }],
      transaction: t
    });
    if (cartItems.length === 0) throw new Error('Your cart is empty');
    const restaurant_id = cartItems[0].MenuItem.restaurant_id;
    let subtotal = 0;
    const orderItemsData =[];
    for (let item of cartItems) {
      if (!item.MenuItem.is_available) {
        throw new Error(`${item.MenuItem.name} is no longer available. Please remove it from your cart.`);
      }
      subtotal += parseFloat(item.MenuItem.price) * item.quantity;
      orderItemsData.push({
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        price: item.MenuItem.price 
      });
    }
    const delivery_fee = 50.00;
    const total_price = subtotal + delivery_fee;
    const order = await Order.create({
      user_id, restaurant_id, total_price, delivery_address, status: 'PENDING'
    }, { transaction: t });
    const mappedOrderItems = orderItemsData.map(item => ({ ...item, order_id: order.id }));
    await OrderItem.bulkCreate(mappedOrderItems, { transaction: t });
    await OrderStatusHistory.create({ order_id: order.id, status: 'PENDING' }, { transaction: t });
    await CartItem.destroy({ where: { user_id }, transaction: t });
    await t.commit();
    res.status(201).json({ status: 'success', data: order });
  } catch (error) {
    await t.rollback();
    res.status(400).json({ status: 'fail', message: error.message || 'Internal Server Error' });
  }
};
// 2. GET /api/orders (Get User Orders with Pagination)
exports.getUserOrders = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50); 
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);
    let whereClause = {};

    if (req.user.role === 'customer') {
      whereClause.user_id = req.user.id;
    } else if (req.user.role === 'driver') {
      whereClause.driver_id = req.user.id;
    }
    const { count, rows } = await Order.findAndCountAll({
      where: whereClause,
      include: [{ model: Restaurant, attributes: ['name', 'address'] }],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });
    res.status(200).json({ 
      status: 'success', 
      total: count, 
      limit, 
      offset, 
      data: rows 
    });
  } catch (error) {
    res.status(500).json({ status: 'fail', message: 'Internal server error' });
  }
};
// 3. GET /api/orders/:id (View Single Order)
exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || isNaN(id)) {
      return res.status(400).json({ status: 'fail', message: 'Invalid order ID format' });
    }
    const whereClause = { id };
    if (req.user.role === 'customer') {
      whereClause.user_id = req.user.id;
    } else if (req.user.role === 'driver') {
      whereClause.driver_id = req.user.id;
    }
    const order = await Order.findOne({
      where: whereClause,
      include:[
        { 
          model: OrderItem,
          include: [{ model: MenuItem, attributes: ['name'] }] 
        },
        { model: OrderStatusHistory },
        { model: Restaurant, attributes: ['name'] }
      ]
    });

    if (!order) {
      return res.status(404).json({ status: 'fail', message: 'Order not found or access denied' });
    }
    res.status(200).json({ status: 'success', data: order });
  } catch (error) {
    console.error("Get Order Error:", error);
    res.status(500).json({ status: 'fail', message: 'Internal server error' });
  }
};

// 4. PUT /api/orders/:id/status (Admin/Driver updates status)
exports.updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  let { status } = req.body; 
  if (!id || isNaN(id)) {
    return res.status(400).json({ status: 'fail', message: 'Invalid order ID format', data: null });
  }
  if (!status) {
    return res.status(400).json({ status: 'fail', message: 'New status is required' });
  }
  status = status.toUpperCase(); 

  const t = await sequelize.transaction();

  try {
    const order = await Order.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!order) {
      await t.rollback();
      return res.status(404).json({ status: 'fail', message: 'Order not found' });
    }
    if (req.user.role === 'driver') {
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

    await OrderStatusHistory.create({ order_id: order.id, status: status }, { transaction: t });
    await t.commit();
    res.status(200).json({ status: 'success', message: `Order status updated to ${status}`, data: order });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ status: 'fail', message: error.message });
  }
};
// 5. PUT /api/orders/:id/assign-driver
exports.assignDriver = async (req, res) => {
  const { id } = req.params;
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

    await OrderStatusHistory.create({ order_id: order.id, status: 'OUT_FOR_DELIVERY' }, { transaction: t });
    await t.commit();
    res.status(200).json({ status: 'success', message: 'Order assigned successfully', data: order });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ status: 'fail', message: error.message });
  }
};
// 6. PUT /api/orders/:id/complete-delivery
exports.completeDelivery = async (req, res) => {
  const { id } = req.params;

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
    await OrderStatusHistory.create({ order_id: order.id, status: 'COMPLETED' }, { transaction: t });
    await t.commit();
    res.status(200).json({ status: 'success', message: 'Delivery completed successfully!', data: order });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ status: 'fail', message: error.message });
  }
};