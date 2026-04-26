const express = require('express');
const cors = require('cors');
require('dotenv').config();
console.log('JWT_SECRET:', process.env.JWT_SECRET);
console.log('JWT_EXPIRES_IN:', process.env.JWT_EXPIRES_IN);
const { sequelize, connectDB } = require('./config/db');

// 1. IMPORT YOUR NEW ROUTES HERE
const authRoutes = require('./routes/authRoutes');
const { protect, restrictTo } = require('./middleware/authMiddleware');

const app = express();

app.use(cors());
app.use(express.json());

// 2. PLUG IN THE ROUTES HERE (Must be below express.json!)
app.use('/api/auth', authRoutes);

app.get('/api/test/protected', protect, (req, res) => {
  res.json({ message: 'Access granted', user: req.user });
});

app.get('/api/test/admin', protect, restrictTo('admin'), (req, res) => {
  res.json({ message: 'Admin access granted' });
});

// REAL Health Check
app.get('/api/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.status(200).json({ status: 'OK', db: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', db: 'disconnected' });
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Express server running on port ${PORT}`);
  });
};

startServer();
