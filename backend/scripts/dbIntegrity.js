// backend/scripts/dbIntegrity.js
//
// Runs integrity checks against the live database.
// Catches orphaned records, broken FK chains, and data anomalies
// that Sequelize won't catch at runtime.
//
// Run with:  node scripts/dbIntegrity.js
// Read-only — makes zero changes to the database.

'use strict';

const { sequelize } = require('../config/db');
const { QueryTypes } = require('sequelize');

// ─── helpers ──────────────────────────────────────────────────────────────────

let totalIssues = 0;

const line  = () => console.log('─'.repeat(60));

function report(label, rows, issueDescription) {
  line();
  if (rows.length === 0) {
    console.log(`  ✅  ${label}`);
  } else {
    totalIssues += rows.length;
    console.log(`  ❌  ${label} — ${rows.length} issue(s) found`);
    console.log(`      → ${issueDescription}`);
    console.table(rows.slice(0, 10)); // cap output at 10 rows
    if (rows.length > 10) {
      console.log(`      ... and ${rows.length - 10} more`);
    }
  }
}

// ─── checks ───────────────────────────────────────────────────────────────────

// 1. orders referencing a deleted user
async function checkOrdersWithDeletedUsers() {
  const rows = await sequelize.query(`
    SELECT o.id AS order_id, o.user_id, o.status, o.created_at
    FROM orders o
    JOIN users u ON u.id = o.user_id
    WHERE u.deleted_at IS NOT NULL
  `, { type: QueryTypes.SELECT });

  report(
    'Orders belong to non-deleted users',
    rows,
    'These orders reference soft-deleted users — they may become orphaned.'
  );
}

// 2. orders referencing a deleted restaurant
async function checkOrdersWithDeletedRestaurants() {
  const rows = await sequelize.query(`
    SELECT o.id AS order_id, o.restaurant_id, o.status
    FROM orders o
    JOIN restaurants r ON r.id = o.restaurant_id
    WHERE r.deleted_at IS NOT NULL
      AND o.status NOT IN ('COMPLETED', 'CANCELLED')
  `, { type: QueryTypes.SELECT });

  report(
    'Active orders belong to active restaurants',
    rows,
    'These orders are in-flight but their restaurant has been soft-deleted.'
  );
}

// 3. order_items pointing to soft-deleted menu items
async function checkOrderItemsWithDeletedMenuItems() {
  const rows = await sequelize.query(`
    SELECT oi.order_id, oi.menu_item_id, mi.item_name, mi.deleted_at
    FROM order_items oi
    JOIN menu_items mi ON mi.id = oi.menu_item_id
    WHERE mi.deleted_at IS NOT NULL
    LIMIT 50
  `, { type: QueryTypes.SELECT });

  report(
    'Order items reference existing (or soft-deleted) menu items',
    rows,
    'Historical order items reference menu items that were later deleted — check if reporting is affected.'
  );
}

// 4. completed orders with no payment record
async function checkCompletedOrdersWithNoPayment() {
  const rows = await sequelize.query(`
    SELECT o.id AS order_id, o.status, o.total_amount, o.created_at
    FROM orders o
    LEFT JOIN payments p ON p.order_id = o.id
    WHERE o.status = 'COMPLETED'
      AND p.id IS NULL
  `, { type: QueryTypes.SELECT });

  report(
    'All COMPLETED orders have a payment record',
    rows,
    'A COMPLETED order with no payment row suggests a transaction gap — the atomic checkout may have partially failed.'
  );
}

// 5. payments marked "completed" but order is not PAID/COMPLETED
async function checkMismatchedPaymentStatuses() {
  const rows = await sequelize.query(`
    SELECT p.id AS payment_id, p.status AS payment_status,
           o.id AS order_id,   o.status AS order_status
    FROM payments p
    JOIN orders o ON o.id = p.order_id
    WHERE p.status = 'completed'
      AND o.status NOT IN ('PAID','CONFIRMED','PREPARING','READY','OUT_FOR_DELIVERY','COMPLETED')
  `, { type: QueryTypes.SELECT });

  report(
    'Payment status is consistent with order status',
    rows,
    'Payment marked "completed" but order is in an unexpected status — possible race condition or rollback issue.'
  );
}

// 6. orders missing status history entries
async function checkOrdersMissingStatusHistory() {
  const rows = await sequelize.query(`
    SELECT o.id AS order_id, o.status, o.created_at
    FROM orders o
    LEFT JOIN order_status_history h ON h.order_id = o.id
    WHERE h.order_id IS NULL
  `, { type: QueryTypes.SELECT });

  report(
    'All orders have at least one status history entry',
    rows,
    'These orders were created without logging the initial PENDING status — the checkout transaction may have partially failed.'
  );
}

// 7. drivers assigned to multiple active orders at the same time
async function checkDriversDoubleBooked() {
  const rows = await sequelize.query(`
    SELECT driver_id, COUNT(*) AS active_assignments
    FROM orders
    WHERE status = 'OUT_FOR_DELIVERY'
      AND driver_id IS NOT NULL
    GROUP BY driver_id
    HAVING active_assignments > 1
  `, { type: QueryTypes.SELECT });

  report(
    'No driver is assigned to multiple simultaneous deliveries',
    rows,
    'These drivers are currently OUT_FOR_DELIVERY on more than one order — row-level lock may not have prevented a race condition.'
  );
}

// 8. cart items referencing unavailable or soft-deleted menu items
async function checkCartItemsWithUnavailableItems() {
  const rows = await sequelize.query(`
    SELECT ci.id AS cart_item_id, ci.user_id, mi.item_name,
           mi.is_available, mi.deleted_at
    FROM cart_items ci
    JOIN menu_items mi ON mi.id = ci.menu_item_id
    WHERE mi.is_available = FALSE
       OR mi.deleted_at IS NOT NULL
  `, { type: QueryTypes.SELECT });

  report(
    'All cart items point to available menu items',
    rows,
    'Customers have unavailable or deleted items in their cart — they will hit an error at checkout.'
  );
}

// 9. users with "driver" role but no drivers table entry
async function checkOrphanedDriverUsers() {
  const rows = await sequelize.query(`
    SELECT u.id, u.full_name, u.email
    FROM users u
    LEFT JOIN drivers d ON d.user_id = u.id
    WHERE u.role = 'driver'
      AND d.user_id IS NULL
      AND u.deleted_at IS NULL
  `, { type: QueryTypes.SELECT });

  report(
    'All users with role=driver have a drivers record',
    rows,
    'These users have the driver role but no entry in the drivers table — ISA constraint broken.'
  );
}

// 10. restaurants with no operating hours set
async function checkRestaurantsWithNoHours() {
  const rows = await sequelize.query(`
    SELECT r.id, r.name, r.is_active
    FROM restaurants r
    LEFT JOIN operating_hours oh ON oh.restaurant_id = r.id
    WHERE oh.restaurant_id IS NULL
      AND r.deleted_at IS NULL
      AND r.is_active = TRUE
  `, { type: QueryTypes.SELECT });

  report(
    'All active restaurants have operating hours configured',
    rows,
    'Active restaurants with no operating hours — the frontend cannot show when they are open/closed.'
  );
}

// 11. orders with total_amount != subtotal + delivery_fee + tax - discount
async function checkOrderTotalsConsistency() {
  const rows = await sequelize.query(`
    SELECT
      id AS order_id,
      subtotal, delivery_fee, tax, discount_amount, total_amount,
      ROUND(subtotal + delivery_fee + tax - discount_amount, 2) AS expected_total
    FROM orders
    WHERE ABS(total_amount - (subtotal + delivery_fee + tax - discount_amount)) > 0.01
    LIMIT 50
  `, { type: QueryTypes.SELECT });

  report(
    'Order totals are arithmetically consistent',
    rows,
    'total_amount does not match subtotal + delivery_fee + tax - discount_amount — possible rounding or calculation bug.'
  );
}

// 12. reviews on non-completed orders
async function checkReviewsOnNonCompletedOrders() {
  const rows = await sequelize.query(`
    SELECT rv.id AS review_id, rv.rating, o.id AS order_id, o.status
    FROM reviews rv
    JOIN orders o ON o.id = rv.order_id
    WHERE o.status != 'COMPLETED'
  `, { type: QueryTypes.SELECT });

  report(
    'Reviews only exist on COMPLETED orders',
    rows,
    'A review exists for an order that is not COMPLETED — the review endpoint may be missing a status guard.'
  );
}

// ─── runner ───────────────────────────────────────────────────────────────────

async function run() {
  try {
    await sequelize.authenticate();
    console.log('\n  ✅  Connected to database');
    console.log('  Running integrity checks...\n');

    await checkOrdersWithDeletedUsers();
    await checkOrdersWithDeletedRestaurants();
    await checkOrderItemsWithDeletedMenuItems();
    await checkCompletedOrdersWithNoPayment();
    await checkMismatchedPaymentStatuses();
    await checkOrdersMissingStatusHistory();
    await checkDriversDoubleBooked();
    await checkCartItemsWithUnavailableItems();
    await checkOrphanedDriverUsers();
    await checkRestaurantsWithNoHours();
    await checkOrderTotalsConsistency();
    await checkReviewsOnNonCompletedOrders();

    line();
    if (totalIssues === 0) {
      console.log(`\n  ✅  All checks passed — database integrity looks good.\n`);
    } else {
      console.log(`\n  ⚠️   ${totalIssues} total issue(s) found across all checks.\n`);
    }
  } catch (err) {
    console.error('Integrity check failed:', err.message);
  } finally {
    await sequelize.close();
  }
}

run();