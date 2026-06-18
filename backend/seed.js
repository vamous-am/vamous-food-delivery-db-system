// backend/seed.js
// Seeding order respects FK constraints:
//   1. users → 2. drivers → 3. cuisine_types → 4. restaurants →
//   5. restaurant_cuisines → 6. operating_hours → 7. menu_categories →
//   8. menu_items → 9. payment_methods → 10. addresses →
//   11. orders → 12. order_items → 13. order_status_history →
//   14. payments → 15. reviews → 16. cart_items
require('dotenv').config();
const bcrypt = require('bcryptjs');
const {
  sequelize,
  User, Driver, Address, CuisineType, Restaurant,
  RestaurantCuisine, OperatingHour, MenuCategory, MenuItem,
  PaymentMethod, Order, OrderItem, OrderStatusHistory, Payment,
  Review, CartItem,
} = require('./models');

const SALT_ROUNDS = 10;

async function seed() {
  try {
    console.log('🔄 Dropping and recreating all tables...');
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    await sequelize.sync({ force: true });
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✅ Tables created (16 tables)\n');

    // ── 1. USERS ──────────────────────────────────────────────────────────
    console.log('🌱 Seeding users...');
    const hash = (pw) => bcrypt.hashSync(pw, SALT_ROUNDS);
    const [customer, owner, driver, admin] = await User.bulkCreate([
      { email: 'customer@test.com', password_hash: hash('password123'), full_name: 'Ahmed Customer', phone: '+251911000001', role: 'customer' },
      { email: 'owner@test.com', password_hash: hash('password123'), full_name: 'Marta Owner', phone: '+251911000002', role: 'restaurant_owner' },
      { email: 'driver@test.com', password_hash: hash('password123'), full_name: 'Dawit Driver', phone: '+251911000003', role: 'driver' },
      { email: 'admin@test.com', password_hash: hash('password123'), full_name: 'Amanuel Admin', phone: '+251911000004', role: 'admin' },
    ]);
    console.log(`   ✅ ${await User.count()} users`);

    // ── 2. DRIVERS ────────────────────────────────────────────────────────
    console.log('🌱 Seeding drivers...');
    await Driver.create({
      user_id: driver.id,
      license_number: 'ET-DL-2024-001',
      vehicle_type: 'motorcycle',
      is_available: true,
    });
    console.log(`   ✅ ${await Driver.count()} drivers`);

    // ── 3. CUISINE_TYPES ──────────────────────────────────────────────────
    console.log('🌱 Seeding cuisine types...');
    const [ethiopian, italian, fastFood] = await CuisineType.bulkCreate([
      { type_name: 'Ethiopian' },
      { type_name: 'Italian' },
      { type_name: 'Fast Food' },
    ]);
    console.log(`   ✅ ${await CuisineType.count()} cuisine types`);

    // ── 4. RESTAURANTS ────────────────────────────────────────────────────
    console.log('🌱 Seeding restaurants...');
    const [rest1, rest2] = await Restaurant.bulkCreate([
      {
        owner_id: owner.id,
        name: 'Habesha Kitchen',
        description: 'Authentic Ethiopian cuisine in the heart of Addis',
        address: 'Bole, Addis Ababa',
        phone: '+251912345678',
        delivery_fee: 30.00,
        estimated_time: 35,
        is_active: true,
        image_url: 'https://res.cloudinary.com/ds6pmxirq/image/upload/q_auto/f_auto/v1781349867/images_g4v0bn.jpg',
      },
      {
        owner_id: owner.id,
        name: 'Campus Burger',
        description: 'Fast food for busy students',
        address: 'AAU Main Campus, Addis Ababa',
        phone: '+251919876543',
        delivery_fee: 20.00,
        estimated_time: 20,
        is_active: true,
        image_url: 'https://res.cloudinary.com/ds6pmxirq/image/upload/q_auto/f_auto/v1781352051/campus_oca9rd.png',
      },
    ]);
    console.log(`   ✅ ${await Restaurant.count()} restaurants`);

    // ── 5. RESTAURANT_CUISINES ────────────────────────────────────────────
    console.log('🌱 Seeding restaurant cuisines...');
    await RestaurantCuisine.bulkCreate([
      { restaurant_id: rest1.id, cuisine_id: ethiopian.id },
      { restaurant_id: rest2.id, cuisine_id: fastFood.id },
      { restaurant_id: rest2.id, cuisine_id: italian.id },
    ]);
    console.log(`   ✅ ${await RestaurantCuisine.count()} restaurant-cuisine mappings`);

    // ── 6. OPERATING_HOURS ────────────────────────────────────────────────
    console.log('🌱 Seeding operating hours...');
    const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const weekend = ['Saturday', 'Sunday'];
    const hours = [];

    for (const day of weekdays) {
      hours.push(
        { restaurant_id: rest1.id, day_of_week: day, open_time: '08:00:00', close_time: '22:00:00' },
        { restaurant_id: rest2.id, day_of_week: day, open_time: '07:00:00', close_time: '23:00:00' }
      );
    }
    for (const day of weekend) {
      hours.push(
        { restaurant_id: rest1.id, day_of_week: day, open_time: '09:00:00', close_time: '21:00:00' },
        { restaurant_id: rest2.id, day_of_week: day, open_time: '09:00:00', close_time: '22:00:00' }
      );
    }
    await OperatingHour.bulkCreate(hours);
    console.log(`   ✅ ${await OperatingHour.count()} operating hour entries`);

    // ── 7. MENU_CATEGORIES ────────────────────────────────────────────────
    console.log('🌱 Seeding menu categories...');
    const [mainDishes, drinks, burgers, sides] = await MenuCategory.bulkCreate([
      { restaurant_id: rest1.id, category_name: 'Main Dishes', display_order: 1 },
      { restaurant_id: rest1.id, category_name: 'Drinks', display_order: 2 },
      { restaurant_id: rest2.id, category_name: 'Burgers', display_order: 1 },
      { restaurant_id: rest2.id, category_name: 'Sides', display_order: 2 },
    ]);
    console.log(`   ✅ ${await MenuCategory.count()} menu categories`);

    // ── 8. MENU_ITEMS ─────────────────────────────────────────────────────
    console.log('🌱 Seeding menu items...');
    const [injera, , tej, , classic, , fries] = await MenuItem.bulkCreate([
      { restaurant_id: rest1.id, category_id: mainDishes.id, item_name: 'Injera with Tibs', description: 'Traditional injera with spiced beef', price: 120.00, is_available: true },
      { restaurant_id: rest1.id, category_id: mainDishes.id, item_name: 'Doro Wot', description: 'Ethiopian chicken stew', price: 150.00, is_available: true },
      { restaurant_id: rest1.id, category_id: drinks.id, item_name: 'Tej', description: 'Traditional honey wine', price: 50.00, is_available: true },
      { restaurant_id: rest1.id, category_id: drinks.id, item_name: 'Ethiopian Coffee', description: 'Fresh brewed Buna', price: 35.00, is_available: true },
      { restaurant_id: rest2.id, category_id: burgers.id, item_name: 'Classic Burger', description: 'Beef patty, lettuce, tomato', price: 85.00, is_available: true },
      { restaurant_id: rest2.id, category_id: burgers.id, item_name: 'Double Smash', description: 'Double patty, special sauce', price: 120.00, is_available: true },
      { restaurant_id: rest2.id, category_id: sides.id, item_name: 'Crispy Fries', description: 'Seasoned french fries', price: 40.00, is_available: true },
      { restaurant_id: rest2.id, category_id: sides.id, item_name: 'Onion Rings', description: 'Beer-battered onion rings', price: 45.00, is_available: true },
    ]);
    console.log(`   ✅ ${await MenuItem.count()} menu items`);

    // ── 9. PAYMENT_METHODS ────────────────────────────────────────────────
    console.log('🌱 Seeding payment methods...');
    const [cod, bankTransfer] = await PaymentMethod.bulkCreate([
      { method_name: 'Cash on Delivery' },
      { method_name: 'Bank Transfer' },
      { method_name: 'Tele Birr' },
      { method_name: 'Simulated (Dev Only)' },
    ]);
    console.log(`   ✅ ${await PaymentMethod.count()} payment methods`);

    // ── 10. ADDRESSES ─────────────────────────────────────────────────────
    console.log('🌱 Seeding addresses...');
    const [addr1] = await Address.bulkCreate([
      { user_id: customer.id, street: 'Bole Road, Building 12', city: 'Addis Ababa', postal_code: '1000', is_default: true },
      { user_id: customer.id, street: 'AAU Dorm Block C', city: 'Addis Ababa', postal_code: '1001', is_default: false },
    ]);
    console.log(`   ✅ ${await Address.count()} addresses`);

    // ── 11. ORDERS ────────────────────────────────────────────────────────
    console.log('🌱 Seeding sample order (COD flow)...');
    const sampleOrder = await Order.create({
      user_id: customer.id,
      restaurant_id: rest2.id,
      address_id: addr1.id,
      driver_id: driver.id,
      status: 'COMPLETED',
      subtotal: 125.00,
      tax: 0.00,
      delivery_fee: 20.00,
      discount_amount: 0.00,
      total_amount: 145.00,
      special_instructions: 'Please ring the bell twice',
    });
    console.log(`   ✅ ${await Order.count()} orders`);

    // ── 12. ORDER_ITEMS ───────────────────────────────────────────────────
    console.log('🌱 Seeding order items...');
    await OrderItem.bulkCreate([
      { order_id: sampleOrder.id, line_no: 1, menu_item_id: classic.id, quantity: 1, unit_price: 85.00 },
      { order_id: sampleOrder.id, line_no: 2, menu_item_id: fries.id, quantity: 1, unit_price: 40.00 },
    ]);
    console.log(`   ✅ ${await OrderItem.count()} order items`);

    // ── 13. ORDER_STATUS_HISTORY ──────────────────────────────────────────
    console.log('🌱 Seeding order status history...');
    const now = new Date();
    await OrderStatusHistory.bulkCreate([
      { order_id: sampleOrder.id, updated_at: new Date(now - 3600000 * 5), status_name: 'PENDING', actor_user_id: customer.id, notes: 'Order placed' },
      { order_id: sampleOrder.id, updated_at: new Date(now - 3600000 * 4), status_name: 'PAID', actor_user_id: customer.id, notes: 'Cash on delivery' },
      { order_id: sampleOrder.id, updated_at: new Date(now - 3600000 * 3), status_name: 'CONFIRMED', actor_user_id: owner.id, notes: 'Restaurant confirmed' },
      { order_id: sampleOrder.id, updated_at: new Date(now - 3600000 * 2), status_name: 'PREPARING', actor_user_id: owner.id, notes: null },
      { order_id: sampleOrder.id, updated_at: new Date(now - 3600000 * 1), status_name: 'READY', actor_user_id: owner.id, notes: 'Ready for pickup' },
      { order_id: sampleOrder.id, updated_at: new Date(now - 1800000), status_name: 'OUT_FOR_DELIVERY', actor_user_id: driver.id, notes: 'Driver picked up' },
      { order_id: sampleOrder.id, updated_at: now, status_name: 'COMPLETED', actor_user_id: driver.id, notes: 'Delivered to customer' },
    ]);
    console.log(`   ✅ ${await OrderStatusHistory.count()} status history entries`);

    // ── 14. PAYMENTS ──────────────────────────────────────────────────────
    console.log('🌱 Seeding payments...');
    await Payment.create({
      order_id: sampleOrder.id,
      payment_method_id: cod.id,
      amount: 145.00,
      status: 'completed',
      transaction_id: 'COD-DEMO-001',
      paid_at: now,
    });
    console.log(`   ✅ ${await Payment.count()} payments`);

    // ── 15. REVIEWS ───────────────────────────────────────────────────────
    console.log('🌱 Seeding reviews...');
    await Review.create({
      order_id: sampleOrder.id,
      rating: 5,
      comment: 'Excellent burgers! Fast delivery and still hot.',
    });
    console.log(`   ✅ ${await Review.count()} reviews`);

    // ── 16. CART_ITEMS ────────────────────────────────────────────────────
    console.log('🌱 Seeding cart items...');
    await CartItem.bulkCreate([
      { user_id: customer.id, menu_item_id: injera.id, quantity: 2 },
      { user_id: customer.id, menu_item_id: tej.id, quantity: 1 },
    ]);
    console.log(`   ✅ ${await CartItem.count()} cart items`);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ SEED COMPLETE — SaporiVivi Database (16 tables)');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('\n📋 Primary Payment Methods:');
    console.log(`   1. Cash on Delivery (ID: ${cod.id}) — Automatic PAID status`);
    console.log(`   2. Bank Transfer (ID: ${bankTransfer.id}) — Requires admin confirmation`);
    console.log('\n🔐 Test Credentials (password123):');
    console.log('   Customer:          customer@test.com');
    console.log('   Restaurant Owner:  owner@test.com');
    console.log('   Driver:            driver@test.com');
    console.log('   Admin:             admin@test.com');
    console.log('═══════════════════════════════════════════════════════════\n');

    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Seed failed:', err.message);
    console.error(err.stack);
    await sequelize.close();
    process.exit(1);
  }
}

seed();
