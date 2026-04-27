/**
 * Student Routes
 * Protected endpoints for student-specific data
 * 
 * Endpoints:
 * GET /api/student/dashboard       - Get student dashboard with stats
 * GET /api/student/courses        - Get enrolled courses with grades
 * GET /api/student/assignments     - Get assignments with submission status
 * GET /api/student/results        - Get grades/results
 * GET /api/student/notifications  - Get student notifications
 * PUT /api/student/notifications/:id/read - Mark notification as read
 */
const express = require('express');
const router = express.Router();
const { studentController } = require('../controllers');
const { auth, cacheMiddleware } = require('../middleware');

// GET /api/student/dashboard - Returns student stats (courses, grades, notifications count)
router.get('/dashboard', auth(['student']), cacheMiddleware(60), studentController.getDashboardData);

// GET /api/student/courses - Get all enrolled courses with grades
router.get('/courses', auth(['student']), cacheMiddleware(300), studentController.getCoursesWithGrades);

// GET /api/student/assignments - Get assignments with submission status
router.get('/assignments', auth(['student']), studentController.getAssignmentsWithStatus);

// GET /api/student/results - Get grades/results (NO CACHE - slow query with populate)
router.get('/results', auth(['student']), studentController.getResults);

// GET /api/student/notifications - Get all notifications
router.get('/notifications', auth(['student']), studentController.getNotifications);

// PUT /api/student/notifications/:id/read - Mark specific notification as read
router.put('/notifications/:id/read', auth(['student']), studentController.markNotificationRead);

// GET /api/student/pyq-courses - Get courses with PYQ availability
router.get('/pyq-courses', auth(['student']), studentController.getPyqCourses);

// POST /api/student/generate-paper - Generate AI paper from PYQs
router.post('/generate-paper', auth(['student']), studentController.generatePaper);

module.exports = router;