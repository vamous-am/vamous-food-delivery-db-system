const { Review, Order, sequelize } = require('../models');

// POST /api/orders/:id/reviews
exports.addReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const orderId = parseInt(req.params.id, 10);

    if (!rating || !Number.isInteger(Number(rating)) || rating < 1 || rating > 5) {
      return res.status(400).json({
        status:  'fail',
        message: 'Rating must be an integer between 1 and 5',
      });
    }

    const order = await Order.findOne({
      where: { id: orderId, user_id: req.user.id },
    });

    if (!order) {
      return res.status(404).json({
        status:  'fail',
        message: 'Order not found or access denied',
      });
    }

    const VALID_STATUSES = ['PENDING','CONFIRMED','PREPARING','READY','OUT_FOR_DELIVERY','COMPLETED','CANCELLED'];
    if (!VALID_STATUSES.includes(order.status)) {
      return res.status(500).json({
        status:  'fail',
        message: 'Order is in an invalid state. Contact support.',
      });
    }

    if (order.status !== 'COMPLETED') {
      return res.status(400).json({
        status:  'fail',
        message: 'You can only review COMPLETED orders',
      });
    }

    const review = await sequelize.transaction(async (t) => {
      return await Review.create({
        order_id: order.id,
        rating:   Number(rating),
        comment:  comment || null,
      }, { transaction: t });
    });

    return res.status(201).json({ status: 'success', data: review });

  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        status:  'fail',
        message: 'You have already reviewed this order',
      });
    }
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        status:  'fail',
        message: error.errors.map(e => e.message).join(', '),
      });
    }
    console.error('[addReview]', error);
    res.status(500).json({ status: 'fail', message: 'Internal server error' });
  }
};

// GET /api/restaurants/:id/reviews
exports.getRestaurantReviews = async (req, res) => {
  try {
    const restaurantId = parseInt(req.params.id, 10);

    const reviews = await Review.findAll({
      include: [{
        model:      Order,
        where:      { restaurant_id: restaurantId },
        attributes: ['user_id', 'createdAt'],
      }],
      order: [['createdAt', 'DESC']],
    });

    const stats = await Review.findOne({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('Review.id')), 'total_reviews'],
        [sequelize.fn('ROUND', sequelize.fn('AVG', sequelize.col('rating')), 2), 'avg_rating'],
      ],
      include: [{
        model:      Order,
        where:      { restaurant_id: restaurantId },
        attributes: [],
      }],
      raw: true,
    });

    const reviewData = reviews.map(r => ({
      rating:    r.rating,
      comment:   r.comment,
      createdAt: r.createdAt,
      userId:    r.Order?.user_id ?? null,
    }));

    return res.status(200).json({
      status: 'success',
      stats: {
        totalReviews:  parseInt(stats?.total_reviews, 10) || 0,
        averageRating: parseFloat(stats?.avg_rating)      || 0,
      },
      data: reviewData,
    });

  } catch (error) {
    console.error('[getRestaurantReviews]', error);
    res.status(500).json({ status: 'fail', message: 'Internal server error' });
  }
};
