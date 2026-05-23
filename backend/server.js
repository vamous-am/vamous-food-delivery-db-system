const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { sequelize, connectDB } = require('./config/db');

const logger        = require('./config/logger');
const requestLogger = require('./middleware/requestLogger');
const errorHandler  = require('./middleware/errorHandler');

// 1. IMPORT ROUTES
const authRoutes = require('./routes/authRoutes');
const restaurantRoutes = require('./routes/restaurantRoutes');
const menuRoutes = require('./routes/menuRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const driverRoutes = require('./routes/driverRoutes');

const app = express();

app.use(requestLogger);
app.use(cors());
app.use(express.json());

// ── Runtime response contract enforcer ─────────────────────────────────────
// Third enforcement layer (ESLint = static, this = runtime).
// Refuses to send any response that doesn't follow { status, data, message }.
// Catches what ESLint misses: dynamic res.json() calls, third-party middleware,
// and any PR that slips past code review.
// Only active outside of test environments to avoid breaking test runners.
if (process.env.NODE_ENV !== 'test') {
  app.use((req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = function (body) {
      // Allow null/empty bodies (used by some 204 No Content responses)
      if (body !== null && body !== undefined) {
        if (
          typeof body !== 'object' ||
          !('status' in body)
        ) {
          // Log the violation so it's visible in Winston, then crash fast
          const err = new Error(
            `Response contract violation on ${req.method} ${req.originalUrl}: ` +
            `body must include a 'status' field. Got: ${JSON.stringify(body)}`
          );
          // Restore original json to avoid infinite recursion in errorHandler
          res.json = originalJson;
          return next(err);
        }
      }
      return originalJson(body);
    };

    next();
  });
}

// 2. MOUNT ROUTES
app.use('/api/auth', authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/menu-items', menuRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/drivers', driverRoutes);

// REAL Health Check
app.get('/api/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.status(200).json({ status: "OK", db: "connected" });
  } catch (error) {
    res.status(500).json({ status: "ERROR", db: "disconnected" });
  }
});

// Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    logger.info(`SaporiVivi backend running`, {
      port: PORT,
      env:  process.env.NODE_ENV ?? 'development',
    });
  });
};
startServer();
