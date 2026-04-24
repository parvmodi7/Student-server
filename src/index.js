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

const connectDB = require('./config/db');
const routes = require('./routes');
const { apiLimiter } = require('./middleware');

const app = express();
const PORT = process.env.PORT || 3000;

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
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 Student Front: ${process.env.STUDENT_FRONT_URL || 'http://localhost:3000'}`);
  console.log(`📝 Teacher Panel: ${process.env.TEACHER_PANEL_URL || 'http://localhost:3001'}`);
});

module.exports = app;