const bcrypt = require('bcryptjs');
const { sequelize } = require('./config/db');
const { User, Restaurant, MenuItem, Order, OrderItem, OrderStatusHistory, Driver } = require('./models');

const seedDatabase = async () => {
  try {
    await sequelize.sync({ force: true });
    console.log('Database synced!');

    // 1. Create Users
    const salt = await bcrypt.genSalt(10);

    // Hash the specific passwords you want to use
    const customerHash = await bcrypt.hash('pass4321wow', salt);
    const adminHash = await bcrypt.hash('passhaha23', salt);
    const driverHash = await bcrypt.hash('passgoal15', salt);

    const customer = await User.create({ name: 'Ahmed (Customer)', email: 'ahme123@gmail.com', password: customerHash, role: 'customer' });
    await User.create({ name: 'Vamous', email: 'vamous23@gmail.com', password: adminHash, role: 'admin' });
    const driverUser = await User.create({ name: 'Dave (Driver)', email: 'deva112@gmail.com', password: driverHash, role: 'driver' });

    // 2. Create Driver
    await Driver.create({ user_id: driverUser.id, license_number: 'DL-123456' });

    // 3. Create Restaurants
    const rest1 = await Restaurant.create({ name: 'Coccon burger', address: '123 Campus Drive' });
    const rest2 = await Restaurant.create({ name: 'Amrogn Chicken', address: '456 College Ave' });

    // 4. Create Menu Items (Captured into variable to prevent hardcoding IDs)
    const items = await MenuItem.bulkCreate([
      { name: 'Garlic Naan', price: 3.50, restaurant_id: rest1.id },
      { name: 'Chicken Tikka', price: 12.00, restaurant_id: rest1.id },
      { name: 'Mango Lassi', price: 4.00, restaurant_id: rest1.id },
      { name: 'Pepperoni Slice', price: 4.50, restaurant_id: rest2.id },
      { name: 'Garlic Knots', price: 5.00, restaurant_id: rest2.id },
      { name: 'Cheese Pizza', price: 15.00, restaurant_id: rest2.id }
    ], { returning: true });

    // 5. Create Sample Order
    const order = await Order.create({
      user_id: customer.id,
      restaurant_id: rest1.id,
      total_price: 15.50,
      status: 'PENDING',
      delivery_address: 'Dorm Room 4B'
    });

    // Use dynamic IDs from the items array!
    await OrderItem.bulkCreate([
      { order_id: order.id, menu_item_id: items[0].id, quantity: 1, price: items[0].price },
      { order_id: order.id, menu_item_id: items[1].id, quantity: 1, price: items[1].price }
    ]);

    await OrderStatusHistory.create({ order_id: order.id, status: 'PENDING' });

    console.log('Seed Data Inserted Successfully!');
    process.exit();
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seedDatabase();
