/**
 * Main Server Entry Point
 * Optimized Express server connecting student-front and teacher-panel
 * 
 * Features:
 * - JWT Authentication
 * - Role-based access (student/teacher)
 * - Response caching to reduce API calls
 * - Rate limiting to prevent Gemini API key exhaustion
 * - CORS support for frontend apps
 * 
 * Base API Endpoints:
 * /api/auth        - Registration & Login
 * /api/user        - Profile management
 * /api/student     - Student-specific data
 * /api/teacher    - Teacher-specific data
 * /api/courses     - Course management
 * /api/assignments - Assignment management
 * /api/grades      - Grade management
 * /api/schedules   - Schedule management
 * /api/ai          - AI features (Gemini)
 * /api/reports     - PDF report generation
 * /api/gamification - XP, achievements, leaderboard
 * /api/health      - Health check
 */
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const multer = require('multer');
const path = require('path');
const { WebSocketServer } = require('ws');

const connectDB = require('./config/db');
const routes = require('./routes');
const { apiLimiter } = require('./middleware');
const websocketService = require('./services/websocket');

const app = express();
const PORT = process.env.PORT || 3000;

// WebSocket Server Setup
const server = require('http').createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws, req) => {
  ('[WS] New client connected');
  
  ws.isAlive = true;
  
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      // Handle authentication
      if (data.type === 'auth') {
        const jwt = require('jsonwebtoken');
        try {
          const decoded = jwt.verify(
            data.token,
            process.env.JWT_SECRET || 'default-secret'
          );
          ws.userId = decoded.id;
          ws.role = decoded.role;
          websocketService.addClient(decoded.id, ws);
          ws.send(JSON.stringify({ type: 'auth_success', userId: decoded.id }));
          ('[WS] Client authenticated:', decoded.id, decoded.role);
        } catch (err) {
          ws.send(JSON.stringify({ type: 'auth_error', error: 'Invalid token' }));
        }
      }
      
      // Handle ping for keepalive
      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    } catch (err) {
      console.error('[WS] Message error:', err);
    }
  });

  ws.on('close', () => {
    if (ws.userId) {
      websocketService.removeClient(ws.userId, ws);
      ('[WS] Client disconnected:', ws.userId);
    }
  });

  ws.on('error', (err) => {
    console.error('[WS] Error:', err);
  });
});

// Heartbeat to detect dead connections
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      if (ws.userId) {
        websocketService.removeClient(ws.userId, ws);
      }
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => {
  clearInterval(interval);
});

('[WS] WebSocket server initialized on /ws');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// Make uploads folder serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to MongoDB
connectDB();

// Security & Performance Middleware
app.use(helmet()); // HTTP security headers
app.use(compression()); // Gzip compression
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin.includes('vercel.app') || origin.includes('localhost')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true }));

// File upload endpoint for teachers
const router = require('express').Router();
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.json({ 
    message: 'File uploaded successfully',
    filename: req.file.filename,
    url: fileUrl
  });
});
app.use('/api', routes, router);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Student-Teacher API Server',
    version: '1.0.0',
    docs: '/api/health',
    links: {
      studentFront: process.env.STUDENT_FRONT_URL || 'http://localhost:3000',
      teacherPanel: process.env.TEACHER_PANEL_URL || 'http://localhost:3001'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// Start server
server.listen(PORT, () => {
  (`🚀 Server running on port ${PORT}`);
  (`📚 Student Front: ${process.env.STUDENT_FRONT_URL || 'http://localhost:3000'}`);
  (`📝 Teacher Panel: ${process.env.TEACHER_PANEL_URL || 'http://localhost:3001'}`);
  (`🔌 WebSocket: ws://localhost:${PORT}/ws`);
});

module.exports = app;