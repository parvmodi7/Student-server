/**
 * AI Routes
 * Protected endpoints with strict rate limiting to prevent Gemini API key exhaustion
 */
const express = require('express');
const router = express.Router();
const { aiController } = require('../controllers');
const { auth, geminiLimiter, cacheMiddleware } = require('../middleware');

// Apply rate limiting to all AI routes
router.use(geminiLimiter);

// General AI chat - cached
router.post('/chat', auth(), cacheMiddleware(600), aiController.chat);

// Student AI features - cached
router.get('/notifications', auth(['student']), cacheMiddleware(300), aiController.getNotifications);
router.get('/predictions', auth(['student']), cacheMiddleware(600), aiController.getPredictions);
router.post('/study', auth(['student']), aiController.studyAssistant);

// Teacher AI features
router.post('/feedback', auth(['teacher']), aiController.generateFeedback);

// Admin - clear cache
router.post('/cache/clear', auth(['admin']), aiController.clearCache);

module.exports = router;