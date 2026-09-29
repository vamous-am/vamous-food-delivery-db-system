const { Order, OrderItem, OrderStatusHistory, MenuItem, Restaurant, Driver, Payment, User, sequelize } = require('../models');
const { Op } = require('sequelize');

// Cancel order: customers only, only PENDING or PENDING_PAYMENT
exports.cancelOrder = async (req, res) => {
  const { id } = req.params;
  if (!id || isNaN(id)) return res.status(400).json({ status: 'fail', message: 'Invalid order ID' });

  const t = await sequelize.transaction();
  try {
    const order = await Order.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!order) { await t.rollback(); return res.status(404).json({ status: 'fail', message: 'Order not found' }); }

    if (req.user.role !== 'customer') { await t.rollback(); return res.status(403).json({ status: 'fail', message: 'Only customers may cancel their orders' }); }
    if (order.user_id !== req.user.id) { await t.rollback(); return res.status(403).json({ status: 'fail', message: 'Access denied: Not your order' }); }

    if (!['PENDING', 'PENDING_PAYMENT'].includes(order.status)) {
      await t.rollback();
      return res.status(400).json({ status: 'fail', message: `Cannot cancel order in status ${order.status}` });
    }

    // If there's a payment and it was completed, mark refunded
    const payment = await Payment.findOne({ where: { order_id: order.id }, transaction: t, lock: t.LOCK.UPDATE });
    if (payment && payment.status === 'completed') {
      payment.status = 'refunded';
      payment.transaction_id = payment.transaction_id || null;
      await payment.save({ transaction: t });
    }

    order.status = 'CANCELLED';
    await order.save({ transaction: t });

    await OrderStatusHistory.create({ order_id: order.id, status_name: 'CANCELLED', actor_user_id: req.user.id, notes: 'Cancelled by customer' }, { transaction: t });

    await t.commit();
    res.status(200).json({ status: 'success', message: 'Order cancelled', data: order });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ status: 'fail', message: error.message });
  }
};

// Get full order timeline (status history) sorted by updated_at
exports.getOrderTimeline = async (req, res) => {
  const { id } = req.params;
  if (!id || isNaN(id)) return res.status(400).json({ status: 'fail', message: 'Invalid order ID' });
  try {
    const order = await Order.findByPk(id);
    if (!order) return res.status(404).json({ status: 'fail', message: 'Order not found' });

    // If customer, ensure they own it
    if (req.user.role === 'customer' && order.user_id !== req.user.id) {
      return res.status(403).json({ status: 'fail', message: 'Access denied' });
    }

    const timeline = await OrderStatusHistory.findAll({ where: { order_id: id }, order: [['updated_at', 'ASC']] });
    res.status(200).json({ status: 'success', data: timeline });
  } catch (error) {
    res.status(500).json({ status: 'fail', message: error.message });
  }
};

// Restaurant report: restaurant_owner only
exports.getRestaurantReport = async (req, res) => {
  try {
    if (req.user.role !== 'restaurant_owner') return res.status(403).json({ status: 'fail', message: 'Access denied' });

    const restaurant = await Restaurant.findOne({ where: { owner_id: req.user.id } });
    if (!restaurant) return res.status(404).json({ status: 'fail', message: 'Restaurant not found for owner' });

    const restaurantId = restaurant.id;

    // Status breakdown (raw SQL)
    const statusBreakdown = await sequelize.query(
      `SELECT status AS status, COUNT(*) AS count FROM orders WHERE restaurant_id = :rid GROUP BY status`,
      { replacements: { rid: restaurantId }, type: sequelize.QueryTypes.SELECT }
    );

    // Revenue last 7 days (grouped by date)
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6);

    const revenueByDay = await sequelize.query(
      `SELECT DATE(created_at) AS date, COALESCE(SUM(total_amount),0) AS revenue FROM orders WHERE restaurant_id = :rid AND status = 'COMPLETED' AND created_at >= :start GROUP BY DATE(created_at) ORDER BY DATE(created_at) ASC`,
      { replacements: { rid: restaurantId, start: start.toISOString() }, type: sequelize.QueryTypes.SELECT }
    );

    // Top 5 items this month (raw SQL)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const topItems = await sequelize.query(
      `SELECT mi.item_name, SUM(oi.quantity) AS units_sold, SUM(oi.unit_price * oi.quantity) AS revenue
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       JOIN menu_items mi ON oi.menu_item_id = mi.id
       WHERE o.restaurant_id = :rid AND o.created_at >= :monthStart
       GROUP BY oi.menu_item_id, mi.item_name
       ORDER BY units_sold DESC
       LIMIT 5`,
      { replacements: { rid: restaurantId, monthStart: monthStart.toISOString() }, type: sequelize.QueryTypes.SELECT }
    );

    res.status(200).json({ status: 'success', data: { restaurant: restaurant.name, statusBreakdown, revenueByDay, topItems } });
  } catch (error) {
    res.status(500).json({ status: 'fail', message: error.message });
  }
};

// Driver report: driver role only
exports.getDriverReport = async (req, res) => {
  try {
    if (req.user.role !== 'driver') return res.status(403).json({ status: 'fail', message: 'Access denied' });

    const driver = await Driver.findOne({ where: { user_id: req.user.id } });
    if (!driver) return res.status(404).json({ status: 'fail', message: 'Driver profile not found' });

    const completedOrders = await Order.findAll({ where: { driver_id: driver.user_id || driver.id, status: 'COMPLETED' }, include: [{ model: OrderStatusHistory }, { model: Restaurant }], order: [['created_at', 'DESC']] });

    const totalDeliveries = completedOrders.length;

    // Compute average delivery minutes and total fees
    let totalMinutes = 0;
    let counted = 0;
    let totalFees = 0;
    const deliveries = [];
    for (const ord of completedOrders) {
      const histories = ord.OrderStatusHistories || ord.OrderStatusHistory || await OrderStatusHistory.findAll({ where: { order_id: ord.id } });
      const out = histories.find(h => h.status_name === 'OUT_FOR_DELIVERY');
      const comp = histories.find(h => h.status_name === 'COMPLETED');
      if (out && comp) {
        const mins = (new Date(comp.updated_at) - new Date(out.updated_at)) / 60000;
        totalMinutes += mins;
        counted++;
      }
      totalFees += parseFloat(ord.delivery_fee || 0);
      deliveries.push({ 
        order_id: ord.id, 
        restaurant_name: ord.Restaurant?.name || 'Unknown', 
        total_amount: parseFloat(ord.total_amount || 0),
        created_at: ord.created_at 
      });
    }

    const avgDeliveryMinutes = counted > 0 ? Number((totalMinutes / counted).toFixed(2)) : null;
    const totalFeesEarned = Number(totalFees.toFixed(2));

    // Last 5 deliveries
    const lastFive = deliveries.slice(0, 5);

    res.status(200).json({ status: 'success', data: { totalDeliveries, avgDeliveryMinutes, totalFeesEarned, lastFive } });
  } catch (error) {
    res.status(500).json({ status: 'fail', message: error.message });
  }
};

// Low stock warnings for restaurant_owner
exports.getLowStockWarnings = async (req, res) => {
  try {
    if (req.user.role !== 'restaurant_owner') return res.status(403).json({ status: 'fail', message: 'Access denied' });
    const restaurant = await Restaurant.findOne({ where: { owner_id: req.user.id } });
    if (!restaurant) return res.status(404).json({ status: 'fail', message: 'Restaurant not found for owner' });

    const items = await MenuItem.findAll({ where: { restaurant_id: restaurant.id, stock_quantity: { [Op.lte]: 5 } }, order: [['stock_quantity', 'ASC']] });
    res.status(200).json({ status: 'success', data: items });
  } catch (error) {
    res.status(500).json({ status: 'fail', message: error.message });
  }
};
