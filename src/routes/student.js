/**
 * Student Routes
 * Protected endpoints for student-specific data
 */
const express = require('express');
const router = express.Router();
const { studentController } = require('../controllers');
const { auth, cacheMiddleware } = require('../middleware');

// Dashboard
router.get('/dashboard', auth(['student']), cacheMiddleware(60), studentController.getDashboardData);

// Courses with grades
router.get('/courses', auth(['student']), cacheMiddleware(300), studentController.getCoursesWithGrades);

// Assignments with status
router.get('/assignments', auth(['student']), cacheMiddleware(180), studentController.getAssignmentsWithStatus);

// Results/Grades
router.get('/results', auth(['student']), cacheMiddleware(300), studentController.getResults);

// Notifications
router.get('/notifications', auth(['student']), studentController.getNotifications);
router.put('/notifications/:id/read', auth(['student']), studentController.markNotificationRead);

module.exports = router;