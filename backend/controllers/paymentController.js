// backend/controllers/paymentController.js
// Uses successResponse/errorResponse helpers, transactions, state machine
const { Order, Payment, PaymentMethod, OrderStatusHistory, sequelize } = require('../models');
const { canTransition }                  = require('../services/orderStateMachine');
const { successResponse, errorResponse } = require('../utils/response');
const logger                             = require('../config/logger');

const recordHistory = async (orderId, status, actorUserId, notes, transaction) => {
  await OrderStatusHistory.create(
    { order_id: orderId, status_name: status, actor_user_id: actorUserId, notes },
    { transaction }
  );
};

// POST /api/payments/simulate/:orderId  — dev/test only
exports.simulatePayment = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const order = await Order.findByPk(req.params.orderId, { lock: t.LOCK.UPDATE, transaction: t });

    if (!order) {
      await t.rollback();
      return errorResponse(res, 'Order not found', 404);
    }

    if (!canTransition(order.status, 'PAID')) {
      await t.rollback();
      return errorResponse(res, `Cannot simulate payment: order is ${order.status}, expected PENDING_PAYMENT`, 400);
    }

    const payment = await Payment.findOne({ where: { order_id: order.id }, lock: t.LOCK.UPDATE, transaction: t });

    if (!payment) {
      await t.rollback();
      return errorResponse(res, 'Payment record not found', 404);
    }

    if (payment.status === 'completed') {
      await t.rollback();
      return errorResponse(res, 'Payment already completed', 409);
    }

    await payment.update(
      { status: 'completed', paid_at: new Date(), transaction_id: `SIM-${Date.now()}` },
      { transaction: t }
    );
    await order.update({ status: 'PAID' }, { transaction: t });
    await recordHistory(order.id, 'PAID', req.user.id, 'Payment simulated (dev/test)', t);
    await t.commit();

    logger.info({ orderId: order.id, userId: req.user.id }, 'Payment simulated — order advanced to PAID');

    return successResponse(
      res,
      { orderId: order.id, orderStatus: 'PAID', paymentStatus: 'completed' },
      'Payment simulated. Order is now PAID.'
    );
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

// POST /api/payments/confirm-transfer/:orderId  — admin only
exports.confirmTransfer = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const order = await Order.findByPk(req.params.orderId, { lock: t.LOCK.UPDATE, transaction: t });

    if (!order) {
      await t.rollback();
      return errorResponse(res, 'Order not found', 404);
    }

    if (!canTransition(order.status, 'PAID')) {
      await t.rollback();
      return errorResponse(res, `Cannot confirm payment: order is ${order.status}, expected PENDING_PAYMENT`, 400);
    }

    const payment = await Payment.findOne({ where: { order_id: order.id }, lock: t.LOCK.UPDATE, transaction: t });

    if (!payment) {
      await t.rollback();
      return errorResponse(res, 'Payment record not found', 404);
    }

    if (payment.status === 'completed') {
      await t.rollback();
      return errorResponse(res, 'Payment already confirmed', 409);
    }

    await payment.update(
      { status: 'completed', paid_at: new Date(), transaction_id: req.body?.transaction_reference ?? null },
      { transaction: t }
    );
    await order.update({ status: 'PAID' }, { transaction: t });
    await recordHistory(order.id, 'PAID', req.user.id, `Manual transfer confirmed by admin ${req.user.id}`, t);
    await t.commit();

    logger.info({ orderId: order.id, adminId: req.user.id }, 'Bank transfer confirmed — order advanced to PAID');

    return successResponse(res, { orderId: order.id, orderStatus: 'PAID' }, 'Transfer confirmed. Order is now PAID.');
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

// GET /api/payment-methods
exports.getPaymentMethods = async (req, res, next) => {
  try {
    const methods = await PaymentMethod.findAll({ order: [['id', 'ASC']] });
    return successResponse(res, methods, 'Payment methods retrieved');
  } catch (err) {
    next(err);
  }
};