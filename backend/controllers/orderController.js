const { Order, OrderItem, OrderStatusHistory, CartItem, MenuItem, Restaurant, Driver, sequelize } = require('../models');
const { canTransition } = require('../services/orderStateMachine');
const { Op } = require('sequelize');
const { successResponse, errorResponse } = require('../utils/response');

// GET /api/orders/admin/stats
exports.getAdminStats = async (req, res, next) => {
  try {
    // Count only active orders
    const activeOrders = await Order.count({
      where: { status: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'] }
    });

    // Calculate revenue for TODAY exactly from the database
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    const revenue = await Order.sum('total_price', {
      where: {
        status: 'COMPLETED',
        createdAt: { [Op.gte]: today }
      }
    });

    return successResponse(res, { activeOrders, todaysRevenue: revenue || 0 }, 'Success', 200);
  } catch (error) {
    next(error);
  }
};

// 1. POST /api/orders
exports.createOrder = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { delivery_address } = req.body;
    const user_id = req.user.id; 

    if (!delivery_address) throw new Error('Delivery address is required');

    const cartItems = await CartItem.findAll({ where: { user_id }, include: [{ model: MenuItem }], transaction: t });
    if (cartItems.length === 0) throw new Error('Your cart is empty');

    const restaurant_id = cartItems[0].MenuItem.restaurant_id;
    let subtotal = 0;
    const orderItemsData =[];

    for (let item of cartItems) {
      if (!item.MenuItem.is_available) throw new Error(`${item.MenuItem.name} is no longer available. Please remove it from your cart.`);
      subtotal += parseFloat(item.MenuItem.price) * item.quantity;
      orderItemsData.push({ menu_item_id: item.menu_item_id, quantity: item.quantity, price: item.MenuItem.price });
    }

    const total_price = subtotal + 50.00; // 50 delivery fee
    const order = await Order.create({ user_id, restaurant_id, total_price, delivery_address, status: 'PENDING' }, { transaction: t });

    const mappedOrderItems = orderItemsData.map(item => ({ ...item, order_id: order.id }));
    await OrderItem.bulkCreate(mappedOrderItems, { transaction: t });
    await OrderStatusHistory.create({ order_id: order.id, status: 'PENDING' }, { transaction: t });
    await CartItem.destroy({ where: { user_id }, transaction: t });

    await t.commit();
    return successResponse(res, order, 'Order created successfully', 201);
  } catch (error) {
    await t.rollback();
    return next(error);
  }
};

// 2. GET /api/orders
exports.getUserOrders = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50); 
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);
    let whereClause = {};

    if (req.user.role === 'customer') {
      whereClause.user_id = req.user.id;
    } else if (req.user.role === 'driver') {
      const driverProfile = await Driver.findOne({ where: { user_id: req.user.id } });
      whereClause.driver_id = driverProfile ? driverProfile.id : null; 
    } else if (req.user.role === 'restaurant_owner') {
      whereClause.restaurant_id = req.user.restaurant_id; 
    }

    const { count, rows } = await Order.findAndCountAll({
      where: whereClause,
      include: [{ model: Restaurant, attributes: ['name', 'address'] }],
      order: [['createdAt', 'DESC']],
      limit, offset
    });

    return successResponse(res, { total: count, limit, offset, data: rows }, 'Success', 200);
  } catch (error) {
    next(error);
  }
};

// 3. GET /api/orders/:id
exports.getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || isNaN(id)) return errorResponse(res, 'Invalid order ID format', 400);

    let whereClause = { id };
    if (req.user.role === 'customer') {
      whereClause.user_id = req.user.id;
    } else if (req.user.role === 'driver') {
      const driverProfile = await Driver.findOne({ where: { user_id: req.user.id } });
      whereClause.driver_id = driverProfile ? driverProfile.id : null; 
    } else if (req.user.role === 'restaurant_owner') {
      whereClause.restaurant_id = req.user.restaurant_id; 
    }

    const order = await Order.findOne({
      where: whereClause,
      include:[
        { model: OrderItem, include: [{ model: MenuItem, attributes: ['name'] }] },
        { model: OrderStatusHistory },
        { model: Restaurant, attributes: ['name'] }
      ]
    });

    if (!order) return errorResponse(res, 'Order not found or access denied', 404);
    return successResponse(res, { data: order }, 'Success', 200);
  } catch (error) {
    next(error);
  }
};

// 4. PUT /api/orders/:id/status
exports.updateOrderStatus = async (req, res, next) => {
  const { id } = req.params;
  let { status } = req.body; 

  if (!id || isNaN(id)) return errorResponse(res, 'Invalid order ID format', 400);
  if (!status) return errorResponse(res, 'New status is required', 400);

  status = status.toUpperCase(); 
  const t = await sequelize.transaction();

  try {
    const order = await Order.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!order) { await t.rollback(); return errorResponse(res, 'Order not found', 404); }

    if (req.user.role === 'driver') {
      const driverProfile = await Driver.findOne({ where: { user_id: req.user.id }, transaction: t });
      if (!driverProfile || order.driver_id !== driverProfile.id) {
        await t.rollback(); return errorResponse(res, 'Access denied: You are not assigned to this order', 403);
      }
    }

    if (!canTransition(order.status, status)) {
      await t.rollback(); return errorResponse(res, `Invalid transition! Cannot move order from ${order.status} to ${status}.`, 400);
    }

    order.status = status;
    await order.save({ transaction: t });
    await OrderStatusHistory.create({ order_id: order.id, status: status }, { transaction: t });

    await t.commit();
    return successResponse(res, order, `Order status updated to ${status}`, 200);
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

// 5. PUT /api/orders/:id/assign-driver
exports.assignDriver = async (req, res, next) => {
  const { id } = req.params;
  if (!id || isNaN(id)) return errorResponse(res, 'Invalid order ID format', 400);

  const t = await sequelize.transaction();
  try {
    const driver = await Driver.findOne({ where: { user_id: req.user.id }, transaction: t, lock: t.LOCK.UPDATE });
    if (!driver || !driver.is_active) { await t.rollback(); return errorResponse(res, 'Active driver profile not found', 403); }

    const activeOrder = await Order.findOne({ where: { driver_id: driver.id, status: 'OUT_FOR_DELIVERY' }, transaction: t });
    if (activeOrder) { await t.rollback(); return errorResponse(res, 'You already have an active delivery. Finish it first!', 400); }

    const order = await Order.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!order) { await t.rollback(); return errorResponse(res, 'Order not found', 404); }

    if (order.status !== 'READY') { await t.rollback(); return errorResponse(res, `Order is ${order.status}, not READY for pickup.`, 400); }
    if (order.driver_id !== null) { await t.rollback(); return errorResponse(res, 'Order has already been assigned to another driver.', 400); }

    order.driver_id = driver.id;
    order.status = 'OUT_FOR_DELIVERY'; 
    await order.save({ transaction: t });

    driver.is_available = false;
    await driver.save({ transaction: t });
    await OrderStatusHistory.create({ order_id: order.id, status: 'OUT_FOR_DELIVERY' }, { transaction: t });

    await t.commit();
    return successResponse(res, order, 'Order assigned successfully', 200);
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

// 6. PUT /api/orders/:id/complete-delivery
exports.completeDelivery = async (req, res, next) => {
  const { id } = req.params;
  if (!id || isNaN(id)) return errorResponse(res, 'Invalid order ID format', 400);

  const t = await sequelize.transaction();
  try {
    const driver = await Driver.findOne({ where: { user_id: req.user.id }, transaction: t, lock: t.LOCK.UPDATE });
    if (!driver || !driver.is_active) { await t.rollback(); return errorResponse(res, 'Active driver profile not found', 403); }

    const order = await Order.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!order) { await t.rollback(); return errorResponse(res, 'Order not found', 404); }
    if (order.driver_id !== driver.id) { await t.rollback(); return errorResponse(res, 'You are not assigned to this order', 403); }
    if (order.status !== 'OUT_FOR_DELIVERY') { await t.rollback(); return errorResponse(res, `Cannot complete delivery. Order is currently: ${order.status}`, 400); }
    order.status = 'COMPLETED';
    await order.save({ transaction: t });
    driver.is_available = true;
    await driver.save({ transaction: t });
    await OrderStatusHistory.create({ order_id: order.id, status: 'COMPLETED' }, { transaction: t });
    await t.commit();
    return successResponse(res, order, 'Delivery completed successfully!', 200);
  } catch (error) {
    await t.rollback();
    next(error);
  }
};