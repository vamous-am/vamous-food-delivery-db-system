const { Order, Payment, OrderStatusHistory, sequelize } = require('../models');
const { successResponse, errorResponse } = require('../utils/response');

// 1. POST /api/payments/create-intent
exports.createPaymentIntent = async (req, res, next) => {
  try {
    const { order_id } = req.body;

    if (!order_id || isNaN(order_id)) {
      return errorResponse(res, 'Invalid or missing order_id', 400);
    }

    // Verify order exists, belongs to user, and is PENDING
    const order = await Order.findOne({
      where: { id: order_id, user_id: req.user.id, status: 'PENDING' }
    });

    if (!order) {
      return errorResponse(res, 'Valid pending order not found', 404);
    }

    // Verify no payment is currently processing or already completed
    const activePayment = await Payment.findOne({
      where: {
        order_id,
        status: ['pending', 'completed']
      }
    });

    if (activePayment) {
      return errorResponse(res, 'A payment is already pending or completed for this order', 400);
    }

    // Create a new pending payment
    const payment = await Payment.create({
      order_id: order.id,
      amount: order.total_price,
      status: 'pending',
      payment_method: 'simulated'
    });

    return successResponse(res, {
      clientSecret: 'mock_secret_for_demo_purposes_only',
      payment_id: payment.id
    }, 'Success', 200);
  } catch (error) {
    next(error);
  }
};

// 2. POST /api/payments/simulate/:orderId
exports.simulatePayment = async (req, res, next) => {
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
      return errorResponse(res, 'Order not found or not yours', 404);
    }

    // Idempotency: If Stripe hits us twice but it's already confirmed, just smile and return success
    if (order.status === 'CONFIRMED') {
      await t.rollback();
      return successResponse(res, null, 'Order is already confirmed', 200);
    }

    if (order.status !== 'PENDING') {
      await t.rollback();
      return errorResponse(res, `Cannot pay for order in ${order.status} state`, 400);
    }

    // DB ROW LOCK on the Payment row
    const payment = await Payment.findOne({
      where: { order_id: orderId, status: 'pending' },
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!payment) {
      await t.rollback();
      return errorResponse(res, 'No pending payment found. Create intent first.', 400);
    }

    if (status === 'failed') {
      payment.status = 'failed';
      await payment.save({ transaction: t });
      await t.commit();
      return errorResponse(res, 'Payment failed. Please try again.', 400);
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
    return successResponse(res, { order }, 'Payment successful, order CONFIRMED', 200);
  } catch (error) {
    await t.rollback();
    next(error);
  }
};
