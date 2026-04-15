/**
 * User Routes
 * Protected endpoints for profile management
 */
const express = require('express');
const router = express.Router();
const { authController } = require('../controllers');
const { auth } = require('../middleware');

router.get('/profile', auth(), authController.getProfile);
router.put('/profile', auth(), authController.updateProfile);
router.post('/logout', auth(), authController.logout);

module.exports = router;