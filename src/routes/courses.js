/**
 * Course Routes
 * Public: get courses | Protected: create, update, enroll (role-based)
 * 
 * Public Endpoints:
 * GET /api/courses           - Get all courses (cached)
 * GET /api/courses/:id       - Get single course details
 * 
 * Student Endpoints:
 * GET /api/courses/student/courses - Get enrolled courses
 * POST /api/courses/:id/enroll    - Enroll in a course
 * 
 * Teacher Endpoints:
 * GET /api/courses/teacher/courses - Get courses taught by teacher
 * POST /api/courses               - Create new course
 * PUT /api/courses/:id           - Update course
 */
const express = require('express');
const router = express.Router();
const { courseController } = require('../controllers');
const { auth, cacheMiddleware } = require('../middleware');

// ============ PUBLIC ROUTES (Cached) ============
// GET /api/courses - Get all available courses
router.get('/', cacheMiddleware(300), courseController.getAllCourses);
// GET /api/courses/:id - Get course by ID
router.get('/:id', cacheMiddleware(300), courseController.getCourse);

// ============ STUDENT ROUTES ============
// GET /api/courses/student/courses - Get courses student is enrolled in
router.get('/student/courses', auth(['student']), courseController.getStudentCourses);
// POST /api/courses/:id/enroll - Enroll student in a course
router.post('/:id/enroll', auth(['student']), courseController.enrollCourse);

// ============ TEACHER ROUTES ============
// GET /api/courses/teacher/courses - Get courses taught by this teacher
router.get('/teacher/courses', auth(['teacher']), courseController.getTeacherCourses);
// POST /api/courses - Create new course
router.post('/', auth(['teacher']), courseController.createCourse);
// PUT /api/courses/:id - Update course details
router.put('/:id', auth(['teacher']), courseController.updateCourse);

module.exports = router;