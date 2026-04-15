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
 */
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const connectDB = require('./config/db');
const routes = require('./routes');
const { apiLimiter } = require('./middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Security & Performance Middleware
app.use(helmet()); // HTTP security headers
app.use(compression()); // Gzip compression
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001','https://teacher-panel-three.vercel.app','https://student-panel-frontend-2rcl.vercel.app/login'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true }));

// Apply general rate limiting
app.use('/api', apiLimiter);

// API Routes
app.use('/api', routes);

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