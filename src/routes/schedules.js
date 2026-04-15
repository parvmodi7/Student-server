/**
 * Schedule Routes
 * Protected endpoints for schedule management (role-based)
 * 
 * Student Endpoints:
 * GET /api/schedules           - Get student's weekly schedule (cached)
 * GET /api/schedules/today    - Get today's schedule (cached)
 * 
 * Teacher Endpoints:
 * GET /api/schedules/course/:courseId - Get schedule for a course
 * POST /api/schedules          - Create new schedule entry
 */
const express = require('express');
const router = express.Router();
const { scheduleController } = require('../controllers');
const { auth, cacheMiddleware } = require('../middleware');

// ============ STUDENT ROUTES ============
// GET /api/schedules - Get student's full weekly schedule
router.get('/', auth(['student']), cacheMiddleware(600), scheduleController.getStudentSchedule);
// GET /api/schedules/today - Get only today's classes
router.get('/today', auth(['student']), cacheMiddleware(300), scheduleController.getTodaySchedule);

// ============ TEACHER ROUTES ============
// GET /api/schedules/course/:courseId - Get schedule for a specific course
router.get('/course/:courseId', auth(['teacher']), scheduleController.getCourseSchedule);
// POST /api/schedules - Create new schedule entry (teacher/admin only)
router.post('/', auth(['teacher', 'admin']), scheduleController.createSchedule);

module.exports = router;