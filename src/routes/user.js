/**
 * User Routes
 * Protected endpoints for profile management
 * 
 * Endpoints:
 * GET    /api/user/profile    - Get current user's profile
 * PUT    /api/user/profile   - Update profile (firstName, lastName, avatar)
 * POST   /api/user/logout    - Logout user
 */
const express = require('express');
const router = express.Router();
const { authController } = require('../controllers');
const { auth } = require('../middleware');

// GET /api/user/profile - Get current user profile with role data
router.get('/profile', auth(), authController.getProfile);

// PUT /api/user/profile - Update user profile (firstName, lastName, avatar)
router.put('/profile', auth(), authController.updateProfile);

// POST /api/user/logout - Logout (client-side token removal)
router.post('/logout', auth(), authController.logout);

module.exports = router;