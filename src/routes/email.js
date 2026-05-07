/**
 * Email Routes
 * AI-powered student report email endpoints
 * 
 * Endpoints:
 * GET    /api/email/students     - Get students with report data for email dialog
 * POST   /api/email/send-report  - Send AI report email to a student
 */
const express = require('express');
const router = express.Router();
const { emailController } = require('../controllers');
const { auth } = require('../middleware');

// GET /api/email/students - Get students with data for report email
router.get('/students', auth(['teacher']), emailController.getStudentsForReport);

// POST /api/email/send-report - Send AI-powered report email
router.post('/send-report', auth(['teacher']), emailController.sendStudentReport);

module.exports = router;
