const { Order, Restaurant, Driver } = require('../models');

// GET /api/drivers/available-orders
exports.getAvailableOrders = async (req, res) => {
  try {
    // 1. Ensure the user is actually an active driver
    const driver = await Driver.findOne({ where: { user_id: req.user.id } });
    if (!driver || !driver.is_active) {
      return res.status(403).json({ status: 'fail', message: 'You are not an active driver' });
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

    res.status(200).json({ status: 'success', results: availableOrders.length, data: availableOrders });
  } catch (error) {
    res.status(500).json({ status: 'fail', message: error.message });
  }
};

