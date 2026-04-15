/**
 * Grade Routes
 * Protected endpoints for grade management (role-based)
 */
const express = require('express');
const router = express.Router();
const { gradeController } = require('../controllers');
const { auth, cacheMiddleware } = require('../middleware');

// Student routes - cached
router.get('/', auth(['student']), cacheMiddleware(300), gradeController.getStudentGrades);
router.get('/gpa', auth(['student']), gradeController.getGPA);

// Teacher routes
router.get('/course/:courseId', auth(['teacher']), gradeController.getCourseGrades);

module.exports = router;