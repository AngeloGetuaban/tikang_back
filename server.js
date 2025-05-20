// server.js
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const { WebSocketServer } = require('ws');
require('dotenv').config();

const pool = require('./db');
const routes = require('./routes');

const app = express();
const server = http.createServer(app); // 🔁 Wrap express app in HTTP server
const PORT = process.env.PORT || 5000;

// 🔐 SECURITY MIDDLEWARE
app.use(helmet());
app.use(hpp());
app.use(cors());
app.use(express.json());

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));

// ✅ ENV CHECK
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

// 🔌 WEBSOCKET SERVER
const wss = new WebSocketServer({ server });

let clients = [];

wss.on('connection', (ws) => {
  console.log('🔌 WebSocket client connected');
  clients.push(ws);

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      console.log('📨 Received:', message);

      // Broadcast to all other clients
      clients.forEach(client => {
        if (client !== ws && client.readyState === 1) {
          client.send(JSON.stringify(message));
        }
      });
    } catch (err) {
      console.error('❌ Invalid WebSocket message:', err);
    }
  });

  ws.on('close', () => {
    console.log('❌ WebSocket client disconnected');
    clients = clients.filter(client => client !== ws);
  });
});

// 🚀 START SERVER
server.listen(PORT, () => {
  console.log(`🚀 HTTP + WS server running on http://localhost:${PORT}`);
});
