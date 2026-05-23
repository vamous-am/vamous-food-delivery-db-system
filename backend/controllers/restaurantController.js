const { Restaurant, MenuItem } = require('../models');
const { Op } = require('sequelize');
const { successResponse, errorResponse } = require('../utils/response');

// 1. GET /api/restaurants
exports.getRestaurants = async (req, res, next) => {
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

    return successResponse(res, {
      results: rows.length,
      total: count,
      page,
      totalPages,
      data: rows
    }, 'Success', 200);
  } catch (error) {
    next(error);
  }
};

// 2. GET /api/restaurants/:id
exports.getRestaurantById = async (req, res, next) => {
  try {
    if (isNaN(req.params.id)) return errorResponse(res, 'Invalid ID format', 400);

    const restaurant = await Restaurant.findOne({
      where: { id: req.params.id, is_active: true }
    });

    if (!restaurant) return errorResponse(res, 'Restaurant not found', 404);

    return successResponse(res, { data: restaurant }, 'Success', 200);
  } catch (error) {
    next(error);
  }
};

// 3. GET /api/restaurants/:id/menu
exports.getMenu = async (req, res, next) => {
  try {
    if (isNaN(req.params.id)) return errorResponse(res, 'Invalid ID format', 400);

    const restaurant = await Restaurant.findByPk(req.params.id);
    if (!restaurant || !restaurant.is_active) {
      return errorResponse(res, 'Restaurant not found', 404);
    }

    const menu = await MenuItem.findAll({
      where: { restaurant_id: req.params.id, is_available: true },
      order: [['id', 'ASC']] // Keep menu item order consistent
    });

    return successResponse(res, {
      results: menu.length,
      data: menu
    }, 'Success', 200);
  } catch (error) {
    next(error);
  }
};

// 4. GET /api/menu-items/:id
exports.getMenuItemById = async (req, res, next) => {
  try {
    if (isNaN(req.params.id)) return errorResponse(res, 'Invalid ID format', 400);

    const menuItem = await MenuItem.findOne({
      where: { id: req.params.id, is_available: true }
    });

    if (!menuItem) return errorResponse(res, 'Menu item not found', 404);

    return successResponse(res, { data: menuItem }, 'Success', 200);
  } catch (error) {
    next(error);
  }
};

// --- STUBS FOR OWNER MENU MANAGEMENT ---
exports.addMenuItem = async (req, res, next) => {
  try {
    return errorResponse(res, 'Not implemented yet', 501);
  } catch (error) {
    return next(error);
  }
};

exports.updateMenuItem = async (req, res, next) => {
  try {
    return errorResponse(res, 'Not implemented yet', 501);
  } catch (error) {
    return next(error);
  }
};

exports.softDeleteMenuItem = async (req, res, next) => {
  try {
    return errorResponse(res, 'Not implemented yet', 501);
  } catch (error) {
    return next(error);
  }
};

