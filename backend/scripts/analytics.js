// backend/scripts/analytics.js
//
// Business analytics dashboard for SaporiVivi.
// Run with:  node scripts/analytics.js
// Reads directly from the live database — safe, no writes.

'use strict';

const { sequelize } = require('../config/db');
const { QueryTypes } = require('sequelize');

// ─── helpers ──────────────────────────────────────────────────────────────────

const line  = () => console.log('─'.repeat(60));
const title = (t) => { line(); console.log(`  ${t}`); line(); };
const row   = (obj) => console.table(obj);

// ─── 1. Revenue by restaurant ─────────────────────────────────────────────────
// Which restaurants are generating the most money?
// Joins orders → restaurants, filters only COMPLETED orders.

async function revenueByRestaurant() {
  title('Top 10 Restaurants by Revenue (completed orders)');

  const results = await sequelize.query(`
    SELECT
      r.name                              AS restaurant,
      COUNT(DISTINCT o.id)                AS total_orders,
      ROUND(SUM(o.total_amount), 2)       AS total_revenue,
      ROUND(AVG(o.total_amount), 2)       AS avg_order_value
    FROM orders o
    JOIN restaurants r ON r.id = o.restaurant_id
    WHERE o.status = 'COMPLETED'
      AND r.deleted_at IS NULL
    GROUP BY r.id, r.name
    ORDER BY total_revenue DESC
    LIMIT 10
  `, { type: QueryTypes.SELECT });

  row(results.length ? results : [{ message: 'No completed orders yet' }]);
}

// ─── 2. Driver performance ────────────────────────────────────────────────────
// Deliveries completed per driver and their average delivery window.
// Delivery window = time from OUT_FOR_DELIVERY → COMPLETED in status history.

async function driverPerformance() {
  title('Driver Performance (completed deliveries)');

  const results = await sequelize.query(`
    SELECT
      u.full_name                                      AS driver,
      d.vehicle_type,
      COUNT(o.id)                                      AS deliveries_completed,
      ROUND(AVG(
        TIMESTAMPDIFF(MINUTE, h_out.updated_at, h_done.updated_at)
      ), 1)                                            AS avg_delivery_minutes
    FROM drivers d
    JOIN users u ON u.id = d.user_id
    JOIN orders o ON o.driver_id = d.user_id AND o.status = 'COMPLETED'
    -- when the order went OUT_FOR_DELIVERY
    LEFT JOIN order_status_history h_out
           ON h_out.order_id = o.id
          AND h_out.status_name = 'OUT_FOR_DELIVERY'
    -- when the order was marked COMPLETED
    LEFT JOIN order_status_history h_done
           ON h_done.order_id = o.id
          AND h_done.status_name = 'COMPLETED'
    WHERE d.is_active = TRUE
    GROUP BY d.user_id, u.full_name, d.vehicle_type
    ORDER BY deliveries_completed DESC
  `, { type: QueryTypes.SELECT });

  row(results.length ? results : [{ message: 'No active drivers with completed deliveries' }]);
}

// ─── 3. Order funnel / status breakdown ───────────────────────────────────────
// How many orders are sitting in each status?
// Helps spot stuck orders (e.g. orders stuck in PENDING for hours).

async function orderStatusBreakdown() {
  title('Order Status Breakdown (all time)');

  const results = await sequelize.query(`
    SELECT
      status,
      COUNT(*)                    AS count,
      ROUND(COUNT(*) * 100.0 /
        SUM(COUNT(*)) OVER (), 1) AS pct
    FROM orders
    GROUP BY status
    ORDER BY FIELD(status,
      'PENDING','PENDING_PAYMENT','PAID','CONFIRMED',
      'PREPARING','READY','OUT_FOR_DELIVERY','COMPLETED','CANCELLED')
  `, { type: QueryTypes.SELECT });

  row(results.length ? results : [{ message: 'No orders found' }]);
}

// ─── 4. Most popular menu items ───────────────────────────────────────────────
// Which items appear most often in completed orders?
// Uses order_items joined to menu_items.

async function popularMenuItems() {
  title('Top 10 Most Ordered Menu Items (completed orders)');

  const results = await sequelize.query(`
    SELECT
      mi.item_name                            AS item,
      r.name                                  AS restaurant,
      SUM(oi.quantity)                        AS total_units_sold,
      ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue_generated
    FROM order_items oi
    JOIN menu_items mi   ON mi.id = oi.menu_item_id
    JOIN restaurants r   ON r.id  = mi.restaurant_id
    JOIN orders o        ON o.id  = oi.order_id
    WHERE o.status = 'COMPLETED'
      AND mi.deleted_at IS NULL
    GROUP BY mi.id, mi.item_name, r.name
    ORDER BY total_units_sold DESC
    LIMIT 10
  `, { type: QueryTypes.SELECT });

  row(results.length ? results : [{ message: 'No completed orders yet' }]);
}

// ─── 5. Payment method breakdown ─────────────────────────────────────────────
// Which payment method do customers prefer?

async function paymentMethodBreakdown() {
  title('Revenue by Payment Method');

  const results = await sequelize.query(`
    SELECT
      pm.method_name                      AS payment_method,
      COUNT(p.id)                         AS transactions,
      ROUND(SUM(p.amount), 2)             AS total_collected,
      ROUND(AVG(p.amount), 2)             AS avg_transaction
    FROM payments p
    JOIN payment_methods pm ON pm.id = p.payment_method_id
    WHERE p.status = 'completed'
    GROUP BY pm.id, pm.method_name
    ORDER BY total_collected DESC
  `, { type: QueryTypes.SELECT });

  row(results.length ? results : [{ message: 'No completed payments found' }]);
}

// ─── 6. Peak ordering hours ───────────────────────────────────────────────────
// Which hours of the day get the most orders?
// Useful for staffing and capacity planning.

async function peakOrderingHours() {
  title('Peak Ordering Hours (all orders)');

  const results = await sequelize.query(`
    SELECT
      HOUR(created_at)     AS hour_of_day,
      COUNT(*)             AS orders_placed,
      ROUND(AVG(total_amount), 2) AS avg_order_value
    FROM orders
    GROUP BY HOUR(created_at)
    ORDER BY orders_placed DESC
    LIMIT 12
  `, { type: QueryTypes.SELECT });

  row(results.length ? results : [{ message: 'No orders found' }]);
}

// ─── 7. Customer retention ────────────────────────────────────────────────────
// One-time buyers vs repeat customers.

async function customerRetention() {
  title('Customer Retention (repeat vs one-time)');

  const results = await sequelize.query(`
    SELECT
      CASE
        WHEN order_count = 1 THEN 'One-time buyer'
        WHEN order_count BETWEEN 2 AND 4 THEN 'Returning (2–4 orders)'
        ELSE 'Loyal (5+ orders)'
      END                         AS segment,
      COUNT(*)                    AS customers,
      ROUND(AVG(total_spent), 2)  AS avg_lifetime_spend
    FROM (
      SELECT
        user_id,
        COUNT(id)             AS order_count,
        SUM(total_amount)     AS total_spent
      FROM orders
      WHERE status = 'COMPLETED'
      GROUP BY user_id
    ) AS customer_summary
    GROUP BY segment
    ORDER BY customers DESC
  `, { type: QueryTypes.SELECT });

  row(results.length ? results : [{ message: 'No completed orders yet' }]);
}

// ─── 8. Average rating per restaurant ────────────────────────────────────────
// Reviews joined through orders to restaurants.

async function restaurantRatings() {
  title('Restaurant Ratings (avg from reviews)');

  const results = await sequelize.query(`
    SELECT
      r.name                          AS restaurant,
      COUNT(rv.id)                    AS total_reviews,
      ROUND(AVG(rv.rating), 2)        AS avg_rating,
      MIN(rv.rating)                  AS lowest,
      MAX(rv.rating)                  AS highest
    FROM reviews rv
    JOIN orders o      ON o.id  = rv.order_id
    JOIN restaurants r ON r.id  = o.restaurant_id
    WHERE r.deleted_at IS NULL
    GROUP BY r.id, r.name
    HAVING total_reviews > 0
    ORDER BY avg_rating DESC
  `, { type: QueryTypes.SELECT });

  row(results.length ? results : [{ message: 'No reviews found' }]);
}

// ─── 9. Abandoned carts ───────────────────────────────────────────────────────
// Items sitting in carts with no associated order placed.
// These are lost sales.

async function abandonedCarts() {
  title('Abandoned Cart Summary');

  const results = await sequelize.query(`
    SELECT
      COUNT(DISTINCT ci.user_id)            AS users_with_items_in_cart,
      COUNT(ci.id)                          AS total_cart_items,
      SUM(ci.quantity)                      AS total_units_abandoned,
      ROUND(SUM(ci.quantity * mi.price), 2) AS potential_revenue_lost
    FROM cart_items ci
    JOIN menu_items mi ON mi.id = ci.menu_item_id
    WHERE mi.deleted_at IS NULL
  `, { type: QueryTypes.SELECT });

  row(results);
}

// ─── 10. Cancellation rate per restaurant ─────────────────────────────────────

async function cancellationRate() {
  title('Cancellation Rate by Restaurant');

  const results = await sequelize.query(`
    SELECT
      r.name                                         AS restaurant,
      COUNT(o.id)                                    AS total_orders,
      SUM(o.status = 'CANCELLED')                    AS cancelled,
      ROUND(SUM(o.status = 'CANCELLED') * 100.0
        / COUNT(o.id), 1)                            AS cancellation_pct
    FROM orders o
    JOIN restaurants r ON r.id = o.restaurant_id
    WHERE r.deleted_at IS NULL
    GROUP BY r.id, r.name
    HAVING total_orders > 0
    ORDER BY cancellation_pct DESC
  `, { type: QueryTypes.SELECT });

  row(results.length ? results : [{ message: 'No orders found' }]);
}

// ─── runner ───────────────────────────────────────────────────────────────────

async function run() {
  try {
    await sequelize.authenticate();
    console.log('\n  ✅  Connected to database\n');

    await revenueByRestaurant();
    await driverPerformance();
    await orderStatusBreakdown();
    await popularMenuItems();
    await paymentMethodBreakdown();
    await peakOrderingHours();
    await customerRetention();
    await restaurantRatings();
    await abandonedCarts();
    await cancellationRate();

    line();
    console.log('  ✅  Analytics complete\n');
  } catch (err) {
    console.error('Analytics failed:', err.message);
  } finally {
    await sequelize.close();
  }
}

run();