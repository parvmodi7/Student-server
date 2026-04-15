/**
 * Schedule Routes
 * Protected endpoints for schedule management (role-based)
 */
const express = require('express');
const router = express.Router();
const { scheduleController } = require('../controllers');
const { auth, cacheMiddleware } = require('../middleware');

// Student routes - cached
router.get('/', auth(['student']), cacheMiddleware(600), scheduleController.getStudentSchedule);
router.get('/today', auth(['student']), cacheMiddleware(300), scheduleController.getTodaySchedule);

// Teacher routes
router.get('/course/:courseId', auth(['teacher']), scheduleController.getCourseSchedule);
router.post('/', auth(['teacher', 'admin']), scheduleController.createSchedule);

module.exports = router;