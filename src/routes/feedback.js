/**
 * Feedback Routes
 * Student feedback submission and query management
 * 
 * Endpoints:
 * POST   /api/feedback          - Submit feedback/query (student)
 * GET    /api/feedback/my       - Get student's own feedback history
 * GET    /api/feedback/all      - Get all feedback (teacher/admin)
 */
const express = require('express');
const router = express.Router();
const { feedbackController } = require('../controllers');
const { auth } = require('../middleware');

// POST /api/feedback - Submit a feedback/query
router.post('/', auth(['student']), feedbackController.submitFeedback);

// GET /api/feedback/my - Get student's own feedback
router.get('/my', auth(['student']), feedbackController.getMyFeedback);

// GET /api/feedback/all - Get all feedback (teacher view)
router.get('/all', auth(['teacher']), feedbackController.getAllFeedback);

module.exports = router;
