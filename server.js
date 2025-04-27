// server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
require('dotenv').config();
const pool = require('./db');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 5000;

// 🔐 SECURITY MIDDLEWARE
app.use(helmet());
app.use(hpp());
app.use(cors());
app.use(express.json());

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}))

// ✅ ENV CHECK (optional but helpful)
if (!process.env.JWT_SECRET) {
  console.warn('⚠️ Warning: JWT_SECRET is not defined in your .env file!');
}

// 🩺 HEALTH CHECK
app.get('/', (req, res) => {
  pool.query('SELECT NOW()', (err, dbRes) => {
    if (err) {
      console.error('Database connection error:', err.stack);
      return res.status(500).send('Database connection error');
    }
    res.send(`✅ Database connected at: ${dbRes.rows[0].now}`);
  });
});

// 📦 ROUTES
app.use('/api', routes);

// ❌ 404 HANDLER
app.use((req, res, next) => {
  res.status(404).send('Route not found');
});

// 🛠️ ERROR HANDLER
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong!');
});

// 🚀 START SERVER
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
