const { Order, Payment, OrderStatusHistory, sequelize } = require('../models');

// 1. POST /api/payments/create-intent
exports.createPaymentIntent = async (req, res) => {
  try {
    const { order_id } = req.body;

    if (!order_id || isNaN(order_id)) {
      return res.status(400).json({ status: 'fail', message: 'Invalid or missing order_id' });
    }

    // Verify order exists, belongs to user, and is PENDING
    const order = await Order.findOne({
      where: { id: order_id, user_id: req.user.id, status: 'PENDING' }
    });

    if (!order) {
      return res.status(404).json({ status: 'fail', message: 'Valid pending order not found' });
    }

    // Verify no payment is currently processing or already completed
    const activePayment = await Payment.findOne({
      where: {
        order_id,
        status: ['pending', 'completed']
      }
    });

    if (activePayment) {
      return res.status(400).json({ status: 'fail', message: 'A payment is already pending or completed for this order' });
    }

    // Create a new pending payment
    const payment = await Payment.create({
      order_id: order.id,
      amount: order.total_price,
      status: 'pending',
      payment_method: 'simulated'
    });

    res.status(200).json({
      status: 'success',
      clientSecret: 'mock_secret_for_demo_purposes_only',
      payment_id: payment.id
    });
  } catch (error) {
    res.status(500).json({ status: 'fail', message: error.message });
  }
};

// 2. POST /api/payments/simulate/:orderId
exports.simulatePayment = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { orderId } = req.params;
    const { status } = req.body; // Webhook will send 'completed' or 'failed'

    // DB ROW LOCK: Prevents two webhook calls from hitting this exact row at the same millisecond
    const order = await Order.findOne({
      where: { id: orderId, user_id: req.user.id },
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!order) {
      await t.rollback();
      return res.status(404).json({ status: 'fail', message: 'Order not found or not yours' });
    }

    // Idempotency: If Stripe hits us twice but it's already confirmed, just smile and return success
    if (order.status === 'CONFIRMED') {
      await t.rollback();
      return res.status(200).json({ status: 'success', message: 'Order is already confirmed' });
    }

    if (order.status !== 'PENDING') {
      await t.rollback();
      return res.status(400).json({ status: 'fail', message: `Cannot pay for order in ${order.status} state` });
    }

    // DB ROW LOCK on the Payment row
    const payment = await Payment.findOne({
      where: { order_id: orderId, status: 'pending' },
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!payment) {
      await t.rollback();
      return res.status(400).json({ status: 'fail', message: 'No pending payment found. Create intent first.' });
    }

    // Handle a failed credit card charge
    if (status === 'failed') {
      payment.status = 'failed';
      await payment.save({ transaction: t });
      await t.commit();
      return res.status(400).json({ status: 'fail', message: 'Payment failed. Please try again.' });
    }

    // Handle a successful charge
    payment.status = 'completed';
    await payment.save({ transaction: t });

    order.status = 'CONFIRMED';
    await order.save({ transaction: t });

    await OrderStatusHistory.create({
      order_id: order.id,
      status: 'CONFIRMED'
    }, { transaction: t });

    await t.commit();
    res.status(200).json({ status: 'success', message: 'Payment successful, order CONFIRMED', order });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ status: 'fail', message: error.message });
  }
};
