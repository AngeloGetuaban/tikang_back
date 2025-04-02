const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
require('dotenv').config();
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

const routes = require('./routes');

// --- SECURITY MIDDLEWARE ---
app.use(helmet());
app.use(hpp());
app.use(cors());
app.use(express.json());
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
}));
app.get('/', (req, res) => {
  pool.query('SELECT NOW()', (err, dbRes) => {
    if (err) {
      console.error('Database connection error:', err.stack);
      res.status(500).send('Database connection error');
    } else {
      res.send(`Database connected successfully at: ${dbRes.rows[0].now}`);
    }
  });
});
// --- ROUTES ---
app.use('/api', routes);
app.use((req, res, next) => {
  res.status(404).send('Route not found');
});
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong!');
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
