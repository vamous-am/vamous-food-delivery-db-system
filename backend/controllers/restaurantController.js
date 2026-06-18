// backend/controllers/restaurantController.js
//
//   updateRestaurant   PUT /api/restaurants/:id   — owner/admin only, IDOR check
//   updateMenuItem     PUT /api/menu-items/:id    — owner/admin only, JOIN ownership check
//
// Existing functions unchanged:
//   getRestaurants, getRestaurantById, getRestaurantMenu, getMenuItemById

const cloudinary                                      = require('cloudinary').v2;
const { Restaurant, MenuItem, CuisineType, MenuCategory } = require('../models');
const { Op }                                          = require('sequelize');
const { successResponse, errorResponse }              = require('../utils/response');
const logger                                          = require('../config/logger');

// Configure Cloudinary from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Reusable include — keeps both getRestaurants and getRestaurantById in sync
const CUISINE_INCLUDE = {
  model:      CuisineType,
  as:         'Cuisines',
  attributes: ['id', 'type_name'],
  through:    { attributes: [] },
};

// ── helper: extract Cloudinary public_id from a stored URL ────────────────────
// e.g. "https://res.cloudinary.com/.../saporivivi/restaurants/abc123.jpg"
//   → "saporivivi/restaurants/abc123"
const extractPublicId = (url) => {
  if (!url) return null;
  try {
    const withoutExt  = url.replace(/\.[^/.]+$/, '');
    const parts       = withoutExt.split('/upload/');
    if (parts.length < 2) return null;
    // Strip version segment (v1234567890/) if present
    const afterUpload = parts[1].replace(/^v\d+\//, '');
    return afterUpload;
  } catch {
    return null;
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/restaurants
// ══════════════════════════════════════════════════════════════════════════════
exports.getRestaurants = async (req, res, next) => {
  try {
    const { name, cuisine } = req.query;
    const limit  = Math.min(parseInt(req.query.limit)  || 10, 50);
    const offset = Math.max(parseInt(req.query.offset) || 0,  0);

    const whereClause   = { is_active: true };
    const andConditions = [];

    if (name)    andConditions.push({ name: { [Op.like]: `%${name}%` } });
    if (cuisine) andConditions.push({ name: { [Op.like]: `%${cuisine}%` } });
    if (andConditions.length > 0) whereClause[Op.and] = andConditions;

    const { count, rows } = await Restaurant.findAndCountAll({
      where:   whereClause,
      include: [CUISINE_INCLUDE],
      limit,
      offset,
    });

    return res.status(200).json({
      status:     'success',
      total:      count,
      page:       Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(count / limit),
      results:    rows.length,
      data:       rows,
    });
  } catch (error) {
    next(error);
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/restaurants/:id
// ══════════════════════════════════════════════════════════════════════════════
exports.getRestaurantById = async (req, res, next) => {
  try {
    if (isNaN(req.params.id)) return errorResponse(res, 'Invalid ID format', 400);

    const restaurant = await Restaurant.findOne({
      where:   { id: req.params.id, is_active: true },
      include: [CUISINE_INCLUDE],
    });
    if (!restaurant) return errorResponse(res, 'Restaurant not found or inactive', 404);

    return successResponse(res, restaurant, 'Restaurant retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/restaurants/:id/menu
// ══════════════════════════════════════════════════════════════════════════════
exports.getRestaurantMenu = async (req, res, next) => {
  try {
    if (isNaN(req.params.id)) return errorResponse(res, 'Invalid ID format', 400);

    const restaurant = await Restaurant.findByPk(req.params.id);
    if (!restaurant || !restaurant.is_active) {
      return errorResponse(res, 'Restaurant not found or inactive', 404);
    }

    const menu = await MenuItem.findAll({
      where: { restaurant_id: req.params.id, is_available: true },
    });

    // DTO: maps item_name → name so the existing frontend doesn't break
    const menuData = menu.map(item => ({
      id:           item.id,
      name:         item.item_name,
      description:  item.description,
      price:        item.price,
      is_available: item.is_available,
      category_id:  item.category_id,
      image_url:    item.image_url,
    }));

    return successResponse(res, menuData, 'Menu retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/menu-items/:id
// ══════════════════════════════════════════════════════════════════════════════
exports.getMenuItemById = async (req, res, next) => {
  try {
    if (isNaN(req.params.id)) return errorResponse(res, 'Invalid ID format', 400);

    const menuItem = await MenuItem.findOne({
      where: { id: req.params.id, is_available: true },
    });
    if (!menuItem) return errorResponse(res, 'Menu item not found or unavailable', 404);

    const itemData = {
      id:           menuItem.id,
      name:         menuItem.item_name,
      description:  menuItem.description,
      price:        menuItem.price,
      is_available: menuItem.is_available,
      category_id:  menuItem.category_id,
      image_url:    menuItem.image_url,
    };

    return successResponse(res, itemData, 'Menu item retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// PUT /api/restaurants/:id
// Auth: protect + restrictTo('restaurant_owner', 'admin')
//
// Ownership check: owner must own this restaurant (IDOR guard).
// Admins bypass the ownership check.
// If image_url is being replaced, old Cloudinary image is deleted.
// ══════════════════════════════════════════════════════════════════════════════
exports.updateRestaurant = async (req, res, next) => {
  try {
    if (isNaN(req.params.id)) return errorResponse(res, 'Invalid ID format', 400);

    const isAdmin = req.user.role === 'admin';

    // Build ownership-aware where clause
    const where = isAdmin
      ? { id: req.params.id }
      : { id: req.params.id, owner_id: req.user.id };

    const restaurant = await Restaurant.findOne({ where });
    if (!restaurant) {
      return errorResponse(res, 'Restaurant not found or access denied', 404);
    }

    // Fields the owner is allowed to update
    const { name, description, address, phone, delivery_fee, estimated_time, image_url } = req.body;

    // If a new image_url is provided and it differs from the current one,
    // delete the old image from Cloudinary to avoid orphaned assets
    if (image_url && image_url !== restaurant.image_url && restaurant.image_url) {
      const oldPublicId = extractPublicId(restaurant.image_url);
      if (oldPublicId) {
        try {
          await cloudinary.uploader.destroy(oldPublicId);
        } catch (cdnErr) {
          // Non-fatal — log but don't block the update
          logger.error({ err: cdnErr }, 'Cloudinary cleanup failed for restaurant image');
        }
      }
    }

    await restaurant.update({
      ...(name           !== undefined && { name }),
      ...(description    !== undefined && { description }),
      ...(address        !== undefined && { address }),
      ...(phone          !== undefined && { phone }),
      ...(delivery_fee   !== undefined && { delivery_fee }),
      ...(estimated_time !== undefined && { estimated_time }),
      ...(image_url      !== undefined && { image_url }),
    });

    return successResponse(res, restaurant, 'Restaurant updated successfully');
  } catch (error) {
    next(error);
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// PUT /api/menu-items/:id
// Auth: protect + restrictTo('restaurant_owner', 'admin')
//
// Ownership check: JOIN through Restaurant to verify the item belongs to the
// owner's restaurant. Admins bypass the ownership check.
// If image_url is being replaced, old Cloudinary image is deleted.
// ══════════════════════════════════════════════════════════════════════════════
exports.updateMenuItem = async (req, res, next) => {
  try {
    if (isNaN(req.params.id)) return errorResponse(res, 'Invalid ID format', 400);

    const isAdmin = req.user.role === 'admin';

    // Fetch the item with its parent restaurant for ownership verification
    const menuItem = await MenuItem.findOne({
      where:   { id: req.params.id },
      include: [{
        model:      Restaurant,
        attributes: ['id', 'owner_id'],
        required:   true,
      }],
    });

    if (!menuItem) return errorResponse(res, 'Menu item not found', 404);

    // IDOR guard: non-admin owner must own the parent restaurant
    if (!isAdmin && menuItem.Restaurant.owner_id !== req.user.id) {
      return errorResponse(res, 'Access denied', 403);
    }

    const { item_name, description, price, is_available, image_url } = req.body;

    // Cloudinary cleanup if image is being replaced
    if (image_url && image_url !== menuItem.image_url && menuItem.image_url) {
      const oldPublicId = extractPublicId(menuItem.image_url);
      if (oldPublicId) {
        try {
          await cloudinary.uploader.destroy(oldPublicId);
        } catch (cdnErr) {
          logger.error({ err: cdnErr }, 'Cloudinary cleanup failed for menu item image');
        }
      }
    }

    await menuItem.update({
      ...(item_name    !== undefined && { item_name }),
      ...(description  !== undefined && { description }),
      ...(price        !== undefined && { price }),
      ...(is_available !== undefined && { is_available }),
      ...(image_url    !== undefined && { image_url }),
    });

    // Return DTO consistent with getMenuItemById
    const itemData = {
      id:           menuItem.id,
      name:         menuItem.item_name,
      description:  menuItem.description,
      price:        menuItem.price,
      is_available: menuItem.is_available,
      category_id:  menuItem.category_id,
      image_url:    menuItem.image_url,
    };

    return successResponse(res, itemData, 'Menu item updated successfully');
  } catch (error) {
    next(error);
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/menu-categories?restaurant_id=:id
// Auth: protect + restrictTo('restaurant_owner')
// Returns all categories that belong to the authenticated owner's restaurant.
// ══════════════════════════════════════════════════════════════════════════════
exports.getMenuCategories = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findOne({
      where: { owner_id: req.user.id, is_active: true },
    });
    if (!restaurant) {
      return errorResponse(res, 'No active restaurant found for your account', 403);
    }

    const categories = await MenuCategory.findAll({
      where:      { restaurant_id: restaurant.id },
      order:      [['display_order', 'ASC']],
      attributes: ['id', 'category_name', 'display_order'],
    });

    return successResponse(res, categories, 'Categories retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/menu-items
// Auth: protect + restrictTo('restaurant_owner')
//
// Creates a new menu item linked to the authenticated owner's restaurant.
// category_id is required (NOT NULL in schema).
// image_url is optional — upload via POST /api/upload/menu-item first,
// then pass the returned URL here.
// ══════════════════════════════════════════════════════════════════════════════
exports.createMenuItem = async (req, res, next) => {
  try {
    // Find the owner's active restaurant
    const restaurant = await Restaurant.findOne({
      where: { owner_id: req.user.id, is_active: true },
    });
    if (!restaurant) {
      return errorResponse(res, 'No active restaurant found for your account', 403);
    }

    const { item_name, description, price, category_id, is_available, image_url } = req.body;

    // Validate required fields
    if (!item_name || item_name.trim() === '') {
      return errorResponse(res, 'item_name is required', 400);
    }
    if (!price || isNaN(price) || Number(price) <= 0) {
      return errorResponse(res, 'price must be a positive number', 400);
    }
    if (!category_id) {
      return errorResponse(res, 'category_id is required', 400);
    }

    // Verify the category belongs to this restaurant (IDOR guard)
    const category = await MenuCategory.findOne({
      where: { id: category_id, restaurant_id: restaurant.id },
    });
    if (!category) {
      return errorResponse(res, 'Invalid category for your restaurant', 400);
    }

    const newItem = await MenuItem.create({
      restaurant_id: restaurant.id,
      category_id:   Number(category_id),
      item_name:     item_name.trim(),
      description:   description?.trim() || null,
      price:         Number(price),
      is_available:  is_available !== undefined ? Boolean(is_available) : true,
      image_url:     image_url || null,
    });

    logger.info(
      { menuItemId: newItem.id, restaurantId: restaurant.id, userId: req.user.id },
      'Menu item created'
    );

    // Return DTO consistent with getMenuItemById
    const itemData = {
      id:           newItem.id,
      name:         newItem.item_name,
      description:  newItem.description,
      price:        newItem.price,
      is_available: newItem.is_available,
      category_id:  newItem.category_id,
      image_url:    newItem.image_url,
    };

    return successResponse(res, itemData, 'Menu item created successfully', 201);
  } catch (error) {
    next(error);
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/menu-items/categories
// Auth: protect + restrictTo('restaurant_owner')
//
// Creates a new menu category for the authenticated owner's restaurant.
// ══════════════════════════════════════════════════════════════════════════════
exports.createCategory = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findOne({
      where: { owner_id: req.user.id, is_active: true },
    });
    if (!restaurant) {
      return errorResponse(res, 'No active restaurant found for your account', 403);
    }

    const { category_name } = req.body;
    if (!category_name || category_name.trim() === '') {
      return errorResponse(res, 'category_name is required', 400);
    }

    // Get current max display_order for this restaurant so new category goes last
    const maxOrder = await MenuCategory.max('display_order', {
      where: { restaurant_id: restaurant.id },
    });

    const newCategory = await MenuCategory.create({
      restaurant_id: restaurant.id,
      category_name: category_name.trim(),
      display_order: (maxOrder || 0) + 1,
    });

    logger.info(
      { categoryId: newCategory.id, restaurantId: restaurant.id, userId: req.user.id },
      'Menu category created'
    );

    return successResponse(
      res,
      { id: newCategory.id, category_name: newCategory.category_name, display_order: newCategory.display_order },
      'Category created successfully',
      201
    );
  } catch (error) {
    next(error);
  }
};
