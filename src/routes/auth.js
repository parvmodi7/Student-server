/**
 * Auth Routes
 * Public endpoints for login
 * 
 * Endpoints:
 * POST /api/auth/login - Login user (student or teacher), returns JWT token
 */
const express = require('express');
const router = express.Router();
const { authController } = require('../controllers');
const { authLimiter } = require('../middleware');

// POST /api/auth/login - Login with email/password, returns JWT token
// Auto-detects if student or teacher
router.post('/login', authLimiter, authController.login);

module.exports = router;
