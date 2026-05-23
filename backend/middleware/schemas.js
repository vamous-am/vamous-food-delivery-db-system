const { z } = require('zod');

const positiveInt    = z.number({ coerce: true }).int().positive();
const nonEmptyString = (max = 255) => z.string().trim().min(1).max(max);
const emailField     = z.string().trim().email('Must be a valid email address').max(255);
const passwordField  = z.string().min(8, 'Password must be at least 8 characters').max(100);
const phoneField     = z.string().trim().min(7).max(20);
const rating         = z.number({ coerce: true }).int().min(1).max(5);

const authSchemas = {
  register: z.object({
    full_name: nonEmptyString(100),
    email:     emailField,
    password:  passwordField,
    phone:     phoneField,
    role: z.enum(['customer', 'restaurant_owner', 'driver', 'admin']).optional(),
  }),

  login: z.object({
    email:    emailField,
    password: z.string().min(1, 'Password is required'),
  }),
};

const restaurantSchemas = {
  addMenuItem: z.object({
    restaurant_id: positiveInt,
    category_id:   positiveInt,
    item_name:     nonEmptyString(100),
    description:   z.string().trim().max(500).optional(),
    price:         z.number({ coerce: true }).positive('Price must be greater than 0'),
    is_available:  z.boolean().optional().default(true),
  }),

  updateMenuItem: z.object({
    item_name:    nonEmptyString(100).optional(),
    description:  z.string().trim().max(500).optional(),
    price:        z.number({ coerce: true }).positive().optional(),
    is_available: z.boolean().optional(),
    category_id:  positiveInt.optional(),
  }).refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one field must be provided for update.' }
  ),
};

const cartSchemas = {
  addItem: z.object({
    menu_item_id: positiveInt,
    quantity:     z.number({ coerce: true }).int().min(1, 'Quantity must be at least 1'),
  }),

  updateItem: z.object({
    quantity: z.number({ coerce: true }).int().min(1, 'Quantity must be at least 1'),
  }),
};

const orderSchemas = {
  // Controller builds the order from the cart automatically — only delivery_address is needed
  create: z.object({
    delivery_address: nonEmptyString(500),
  }),

  updateStatus: z.object({
    status: z.enum([
      'CONFIRMED',
      'PREPARING',
      'READY',
      'OUT_FOR_DELIVERY',
      'COMPLETED',
      'CANCELLED',
    ]),
    notes: z.string().trim().max(500).optional(),
  }),
};

const addressSchemas = {
  create: z.object({
    street:      nonEmptyString(255),
    city:        nonEmptyString(100),
    postal_code: z.string().trim().max(20).optional(),
    is_default:  z.boolean().optional().default(false),
  }),

  update: z.object({
    street:      nonEmptyString(255).optional(),
    city:        nonEmptyString(100).optional(),
    postal_code: z.string().trim().max(20).optional(),
    is_default:  z.boolean().optional(),
  }).refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one field must be provided for update.' }
  ),
};

const reviewSchemas = {
  create: z.object({
    rating:  rating,
    comment: z.string().trim().max(1000).optional(),
  }),
};

const paymentSchemas = {
  simulate: z.object({}),
};

const partnerSchemas = {
  restaurantApplication: z.object({
    full_name:       nonEmptyString(100),
    email:           emailField,
    phone:           phoneField,
    restaurant_name: nonEmptyString(100),
    address:         nonEmptyString(255),
  }),

  driverApplication: z.object({
    full_name:      nonEmptyString(100),
    email:          emailField,
    phone:          phoneField,
    license_number: nonEmptyString(50),
    vehicle_type:   z.enum(['bicycle', 'scooter', 'car', 'ebike']),
  }),
};

const schemas = {
  auth:        authSchemas,
  restaurant:  restaurantSchemas,
  cart:        cartSchemas,
  order:       orderSchemas,
  address:     addressSchemas,
  review:      reviewSchemas,
  payment:     paymentSchemas,
  partner:     partnerSchemas,
};

module.exports = { schemas };
