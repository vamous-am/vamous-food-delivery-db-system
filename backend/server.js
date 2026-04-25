const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { sequelize, connectDB } = require('./config/db');

const app = express();

app.use(cors());
app.use(express.json());

// REAL Health Check (Accepted from review)
app.get('/api/health', async (req, res) => {
  try {
    await sequelize.authenticate(); // Actually pings the DB
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

// Safe Startup Sequence (Accepted from review)
const startServer = async () => {
  await connectDB(); // Wait for DB to connect FIRST

  app.listen(PORT, () => {
    console.log(`Express server running on port ${PORT}`);
  });
};

startServer();
