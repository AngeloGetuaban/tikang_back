const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const hpp = require('hpp');
const { WebSocketServer } = require('ws');
require('dotenv').config();
const path = require('path');
const pool = require('./db');
const routes = require('./routes');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// 🔐 SECURITY MIDDLEWARE
app.use(helmet());
app.use(hpp());
app.use(cors());
app.use(express.json());

const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:3000',
  'http://localhost:3001'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// ✅ ENV CHECK
if (!process.env.JWT_SECRET) {
  console.warn('⚠️ Warning: JWT_SECRET is not defined in your .env file!');
}

// Allow cross-origin resource sharing for image files
app.use('/uploads', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, 'uploads')));

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

// ❌ 404 HANDLER (must come after all routes and static files)
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
let lastBookingTimestamp = Date.now();

app.get('/new-entry', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT MAX(created_at) as latest FROM bookings
    `);

    const latest = result.rows[0]?.latest ? new Date(result.rows[0].latest).getTime() : null;

    if (!latest) {
      return res.json({ new: false, timestamp: null });
    }

    const isNew = latest > lastBookingTimestamp;

    if (isNew) {
      lastBookingTimestamp = latest;
    }

    res.json({ new: isNew, timestamp: latest });
  } catch (err) {
    console.error('Error checking new entry:', err);
    res.status(500).json({ error: 'Failed to check new booking entries' });
  }
});

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
