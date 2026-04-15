/**
 * Auth Routes
 * Public endpoints for registration and login
 */
const express = require('express');
const router = express.Router();
const { authController } = require('../controllers');
const { authLimiter } = require('../middleware');

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);

module.exports = router;