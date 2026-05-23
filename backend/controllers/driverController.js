const { Order, Restaurant, Driver } = require('../models');
const { successResponse, errorResponse } = require('../utils/response');

// GET /api/drivers/available-orders
exports.getAvailableOrders = async (req, res, next) => {
  try {
    // 1. Ensure the user is actually an active driver
    const driver = await Driver.findOne({ where: { user_id: req.user.id } });
    if (!driver || !driver.is_active) {
      return errorResponse(res, 'You are not an active driver', 403);
    }

    // 2. Fetch all orders sitting in the 'READY' state that NO ONE has claimed yet
    const availableOrders = await Order.findAll({
      where: {
        status: 'READY',
        driver_id: null
      },
      include: [
        { model: Restaurant, attributes: ['name', 'address'] }
      ],
      order: [['createdAt', 'ASC']] // Oldest orders first
    });

    return successResponse(res, { results: availableOrders.length, data: availableOrders }, 'Success', 200);
  } catch (error) {
    next(error);
  }
};

