/**
 * AI Routes
 * Protected endpoints with strict rate limiting (Gemini API)
 * 
 * General Endpoints:
 * POST /api/ai/chat - General AI chat (cached)
 * 
 * Student Endpoints:
 * GET /api/ai/notifications  - AI-generated study notifications (cached)
 * GET /api/ai/predictions   - AI grade predictions (cached)
 * POST /api/ai/study        - AI study assistant Q&A
 * 
 * Teacher Endpoints:
 * POST /api/ai/feedback - Generate AI feedback for students
 * 
 * Admin Endpoints:
 * POST /api/ai/cache/clear - Clear AI response cache
 */
const express = require('express');
const router = express.Router();
const { aiController } = require('../controllers');
const { auth, geminiLimiter, cacheMiddleware } = require('../middleware');

// Apply rate limiting to all AI routes (prevents API key exhaustion)
router.use(geminiLimiter);

// ============ GENERAL ROUTES ============
// POST /api/ai/chat - General AI chat (cached for 10 min)
router.post('/chat', auth(), cacheMiddleware(600), aiController.chat);

// ============ STUDENT ROUTES ============
// GET /api/ai/notifications - Get AI-generated study reminders
router.get('/notifications', auth(['student']), cacheMiddleware(300), aiController.getNotifications);
// GET /api/ai/predictions - Get AI predicted grades/performance
router.get('/predictions', auth(['student']), cacheMiddleware(600), aiController.getPredictions);
// POST /api/ai/study - Ask AI study questions
router.post('/study', auth(['student']), aiController.studyAssistant);

// ============ TEACHER ROUTES ============
// POST /api/ai/feedback - Generate AI-powered student feedback
router.post('/feedback', auth(['teacher']), aiController.generateFeedback);

// ============ ADMIN ROUTES ============
// POST /api/ai/cache/clear - Clear cached AI responses (admin only)
router.post('/cache/clear', auth(['admin']), aiController.clearCache);

module.exports = router;