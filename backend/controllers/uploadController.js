// backend/controllers/uploadController.js
//
// Flow:
//   1. Frontend sends multipart/form-data with an image file
//   2. multer holds the file in memory (no disk write)
//   3. cloudinary.uploader.upload_stream pushes it to Cloudinary
//   4. Cloudinary returns a secure_url — stored in the DB
//
// Signed uploads — backend credentials are the only entry point.
// No public preset is used; the API secret never leaves the server.

const cloudinary    = require('cloudinary').v2;
const streamifier   = require('streamifier');
const { Restaurant, MenuItem } = require('../models');
const { successResponse, errorResponse } = require('../utils/response');
const logger        = require('../config/logger');

// Configure Cloudinary from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Helper: wrap cloudinary upload_stream in a Promise ───────────────────────
const uploadToCloudinary = (fileBuffer, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,                          // organizes assets in Cloudinary Media Library
        resource_type:  'image',
        transformation: [
          { width: 1200, crop: 'limit' }, // never store images wider than 1200px
          { quality: 'auto:good' },       // Cloudinary auto-optimizes file size
          { fetch_format: 'auto' },       // serves WebP to browsers that support it
        ],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    streamifier.createReadStream(fileBuffer).pipe(stream);
  });
};

// ── Helper: verify the requesting user owns the restaurant ───────────────────
const verifyRestaurantOwnership = async (restaurantId, userId) => {
  const restaurant = await Restaurant.findOne({
    where: { id: restaurantId, owner_id: userId },
  });
  return !!restaurant;
};

// ── Helper: verify the requesting user owns the menu item (via restaurant) ───
const verifyMenuItemOwnership = async (menuItemId, userId) => {
  const item = await MenuItem.findOne({
    where: { id: menuItemId },
    include: [{ model: Restaurant, where: { owner_id: userId }, attributes: [] }],
  });
  return !!item;
};

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/upload/restaurant
// Uploads a restaurant cover image.
// Requires: multipart/form-data with field name 'image' + body field 'restaurant_id'
// Access: restaurant_owner or admin
// ══════════════════════════════════════════════════════════════════════════════
exports.uploadRestaurantImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return errorResponse(res, 'No image file provided', 400);
    }

    // Ownership check — owner can only upload for their own restaurant
    const { restaurant_id } = req.body;
    if (!restaurant_id) {
      return errorResponse(res, 'restaurant_id is required', 400);
    }

    // Admins skip ownership check
    if (req.user.role !== 'admin') {
      const owns = await verifyRestaurantOwnership(restaurant_id, req.user.id);
      if (!owns) {
        return errorResponse(res, 'You can only upload images for your own restaurant', 403);
      }
    }

    const result = await uploadToCloudinary(req.file.buffer, 'saporivivi/restaurants');

    logger.info(
      { publicId: result.public_id, userId: req.user.id, restaurantId: restaurant_id },
      'Restaurant image uploaded'
    );

    return successResponse(
      res,
      { url: result.secure_url, public_id: result.public_id },
      'Image uploaded successfully',
      201
    );
  } catch (err) {
    next(err);
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/upload/menu-item
// Uploads a menu item image.
// Requires: multipart/form-data with field name 'image'
// Optional body field 'menu_item_id' — if provided, ownership is verified.
// If omitted (new item not yet created), the upload proceeds as a staged image.
// Access: restaurant_owner or admin
// ══════════════════════════════════════════════════════════════════════════════
exports.uploadMenuItemImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return errorResponse(res, 'No image file provided', 400);
    }

    const { menu_item_id } = req.body;

    // If menu_item_id is provided, verify ownership (editing an existing item).
    // If not provided, the owner is uploading for a new item not yet created —
    // skip ownership check since the item doesn't exist yet.
    if (menu_item_id && req.user.role !== 'admin') {
      const owns = await verifyMenuItemOwnership(menu_item_id, req.user.id);
      if (!owns) {
        return errorResponse(res, 'You can only upload images for your own menu items', 403);
      }
    }

    const result = await uploadToCloudinary(req.file.buffer, 'saporivivi/menu-items');

    logger.info(
      { publicId: result.public_id, userId: req.user.id, menuItemId: menu_item_id || 'new' },
      'Menu item image uploaded to Cloudinary'
    );

    return successResponse(
      res,
      { url: result.secure_url, public_id: result.public_id },
      'Image uploaded successfully',
      201
    );
  } catch (err) {
    next(err);
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// DELETE /api/upload/image
// Deletes an image from Cloudinary by public_id.
// Prevents orphaned assets when a restaurant or menu item is deleted.
// Requires: JSON body with field 'public_id'
// Access: restaurant_owner or admin
// ══════════════════════════════════════════════════════════════════════════════
exports.deleteImage = async (req, res, next) => {
  try {
    const { public_id } = req.body;
    if (!public_id) {
      return errorResponse(res, 'public_id is required', 400);
    }

    // Scope check — owners can only delete from their own folders
    // public_id format: saporivivi/restaurants/xxx or saporivivi/menu-items/xxx
    if (req.user.role !== 'admin') {
      const isScoped =
        public_id.startsWith('saporivivi/restaurants/') ||
        public_id.startsWith('saporivivi/menu-items/');
      if (!isScoped) {
        return errorResponse(res, 'Invalid image path', 403);
      }
    }

    const result = await cloudinary.uploader.destroy(public_id);

    if (result.result !== 'ok' && result.result !== 'not found') {
      return errorResponse(res, 'Failed to delete image from Cloudinary', 500);
    }

    logger.info(
      { publicId: public_id, userId: req.user.id, cloudinaryResult: result.result },
      'Image deleted from Cloudinary'
    );

    return successResponse(res, { public_id, result: result.result }, 'Image deleted successfully');
  } catch (err) {
    next(err);
  }
};
