const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// 1. USER MODEL
const User = sequelize.define('User', {
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('customer', 'admin', 'restaurant_owner', 'driver'), defaultValue: 'customer' }
}, {
  tableName: 'users',
  timestamps: false,
  indexes: [{ unique: true, fields: ['email'] }]
});

// 2. RESTAURANT MODEL
const Restaurant = sequelize.define('Restaurant', {
  name: { type: DataTypes.STRING, allowNull: false },
  address: { type: DataTypes.STRING, allowNull: false },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
  tableName: 'restaurants',
  timestamps: false
});

// 3. MENU ITEM MODEL (Added Index for restaurant_id)
const MenuItem = sequelize.define('MenuItem', {
  name: { type: DataTypes.STRING, allowNull: false },
  price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  is_available: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
  tableName: 'menu_items',
  timestamps: false,
  indexes: [{ fields: ['restaurant_id'] }]
});

// 4. ORDER MODEL
const Order = sequelize.define('Order', {
  total_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  status: {
    type: DataTypes.ENUM('PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED'),
    defaultValue: 'PENDING'
  },
  delivery_address: { type: DataTypes.STRING, allowNull: false }
}, {
  tableName: 'orders',
  timestamps: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['restaurant_id'] },
    { fields: ['driver_id'] }
  ]
});

// 5. ORDER ITEM MODEL (Added Indexes for order_id and menu_item_id)
const OrderItem = sequelize.define('OrderItem', {
  quantity: { type: DataTypes.INTEGER, allowNull: false },
  price: { type: DataTypes.DECIMAL(10, 2), allowNull: false }
}, {
  tableName: 'order_items',
  timestamps: false,
  indexes: [
    { fields: ['order_id'] },
    { fields: ['menu_item_id'] }
  ]
});

// 6. ORDER STATUS HISTORY MODEL (Converted to ENUM & Added Index)
const OrderStatusHistory = sequelize.define('OrderStatusHistory', {
  status: {
    type: DataTypes.ENUM('PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED'),
    allowNull: false
  }
}, {
  tableName: 'order_status_history',
  timestamps: true,
  indexes: [{ fields: ['order_id'] }]
});

// 7. DRIVER MODEL (Added Unique Index for user_id)
const Driver = sequelize.define('Driver', {
  license_number: { type: DataTypes.STRING, allowNull: false },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
  tableName: 'drivers',
  timestamps: false,
  indexes: [{ unique: true, fields: ['user_id'] }]
});

// 8. CART ITEM MODEL (Enterprise Upgraded)
const CartItem = sequelize.define('CartItem', {
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  }
}, {
  tableName: 'cart_items',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['user_id', 'menu_item_id'] }, // PREVENTS DUPLICATE ROWS!
    { fields: ['user_id'] },
    { fields: ['menu_item_id'] }
  ]
});


// ==========================================
// STRICT RELATIONSHIPS (allowNull: false)
// ==========================================

User.hasMany(Order, { foreignKey: { name: 'user_id', allowNull: false } });
Order.belongsTo(User, { foreignKey: { name: 'user_id', allowNull: false } });

Restaurant.hasMany(Order, { foreignKey: { name: 'restaurant_id', allowNull: false } });
Order.belongsTo(Restaurant, { foreignKey: { name: 'restaurant_id', allowNull: false } });

Order.hasMany(OrderItem, { foreignKey: { name: 'order_id', allowNull: false } });
OrderItem.belongsTo(Order, { foreignKey: { name: 'order_id', allowNull: false } });

MenuItem.hasMany(OrderItem, { foreignKey: { name: 'menu_item_id', allowNull: false } });
OrderItem.belongsTo(MenuItem, { foreignKey: { name: 'menu_item_id', allowNull: false } });

Order.hasMany(OrderStatusHistory, { foreignKey: { name: 'order_id', allowNull: false } });
OrderStatusHistory.belongsTo(Order, { foreignKey: { name: 'order_id', allowNull: false } });

// Driver is optional on Order, so allowNull is true here
Driver.hasMany(Order, { foreignKey: { name: 'driver_id', allowNull: true } });
Order.belongsTo(Driver, { foreignKey: { name: 'driver_id', allowNull: true } });

// Driver MUST have a User
User.hasOne(Driver, { foreignKey: { name: 'user_id', allowNull: false } });
Driver.belongsTo(User, { foreignKey: { name: 'user_id', allowNull: false } });

Restaurant.hasMany(MenuItem, { foreignKey: { name: 'restaurant_id', allowNull: false } });
MenuItem.belongsTo(Restaurant, { foreignKey: { name: 'restaurant_id', allowNull: false } });

// CART ITEM RELATIONSHIPS
User.hasMany(CartItem, { foreignKey: { name: 'user_id', allowNull: false } });
CartItem.belongsTo(User, { foreignKey: { name: 'user_id', allowNull: false } });

MenuItem.hasMany(CartItem, { foreignKey: { name: 'menu_item_id', allowNull: false } });
CartItem.belongsTo(MenuItem, { foreignKey: { name: 'menu_item_id', allowNull: false } });

module.exports = { sequelize, User, Restaurant, MenuItem, Order, OrderItem, OrderStatusHistory, Driver, CartItem };
