const { Restaurant, MenuItem } = require('../models');
const { Op } = require('sequelize');

// 1. GET /api/restaurants
exports.getRestaurants = async (req, res) => {
  try {
    const { name, cuisine } = req.query;

    // Strict limit/offset validation (Prevents NaN crashes)
    const parsedLimit = parseInt(req.query.limit);
    const parsedOffset = parseInt(req.query.offset);

    const limit = (!isNaN(parsedLimit) && parsedLimit > 0) ? Math.min(parsedLimit, 50) : 10;
    const offset = (!isNaN(parsedOffset) && parsedOffset >= 0) ? parsedOffset : 0;

    let whereClause = { is_active: true };
    let andConditions = [];

    // NOTE: LIKE '%...%' causes full table scans. Fine for MVP, but production needs MySQL FULLTEXT or Elasticsearch.
    if (name) andConditions.push({ name: { [Op.like]: `%${name}%` } });
    if (cuisine) andConditions.push({ name: { [Op.like]: `%${cuisine}%` } });

    if (andConditions.length > 0) {
      whereClause[Op.and] = andConditions;
    }

    const { count, rows } = await Restaurant.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['id', 'ASC']] // Guarantee stable pagination order
    });

    // Complete pagination metadata
    const page = Math.floor(offset / limit) + 1;
    const totalPages = Math.ceil(count / limit);

    res.status(200).json({
      status: 'success',
      results: rows.length,
      total: count,
      page,
      totalPages,
      data: rows
    });
  } catch (error) {
    console.error('getRestaurants Error:', error);
    res.status(500).json({ status: 'fail', message: 'Internal server error' });
  }
};

// 2. GET /api/restaurants/:id
exports.getRestaurantById = async (req, res) => {
  try {
    if (isNaN(req.params.id)) return res.status(400).json({ status: 'fail', message: 'Invalid ID format' });

    const restaurant = await Restaurant.findOne({
      where: { id: req.params.id, is_active: true }
    });

    if (!restaurant) return res.status(404).json({ status: 'fail', message: 'Restaurant not found' });

    res.status(200).json({ status: 'success', data: restaurant });
  } catch (error) {
    console.error('getRestaurantById Error:', error);
    res.status(500).json({ status: 'fail', message: 'Internal server error' });
  }
};

// 3. GET /api/restaurants/:id/menu
exports.getRestaurantMenu = async (req, res) => {
  try {
    if (isNaN(req.params.id)) return res.status(400).json({ status: 'fail', message: 'Invalid ID format' });

    const restaurant = await Restaurant.findByPk(req.params.id);
    if (!restaurant || !restaurant.is_active) {
      return res.status(404).json({ status: 'fail', message: 'Restaurant not found' });
    }

    const menu = await MenuItem.findAll({
      where: { restaurant_id: req.params.id, is_available: true },
      order: [['id', 'ASC']] // Keep menu item order consistent
    });

    res.status(200).json({
      status: 'success',
      results: menu.length,
      data: menu
    });
  } catch (error) {
    console.error('getRestaurantMenu Error:', error);
    res.status(500).json({ status: 'fail', message: 'Internal server error' });
  }
};

// 4. GET /api/menu-items/:id
exports.getMenuItemById = async (req, res) => {
  try {
    if (isNaN(req.params.id)) return res.status(400).json({ status: 'fail', message: 'Invalid ID format' });

    const menuItem = await MenuItem.findOne({
      where: { id: req.params.id, is_available: true }
    });

    if (!menuItem) return res.status(404).json({ status: 'fail', message: 'Menu item not found' });

    res.status(200).json({ status: 'success', data: menuItem });
  } catch (error) {
    console.error('getMenuItemById Error:', error);
    res.status(500).json({ status: 'fail', message: 'Internal server error' });
  }
};
