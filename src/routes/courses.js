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
 * GET /api/courses/student/attendance - Get student's attendance
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

// ============ STUDENT ROUTES (must be before /:id routes) ============
// GET /api/courses/student/courses - Get courses student is enrolled in
router.get('/student/courses', auth(['student']), courseController.getStudentCourses);
// GET /api/courses/student/attendance - Get student's attendance
router.get('/student/attendance', auth(['student']), courseController.getStudentAttendance);
// POST /api/courses/:id/enroll - Enroll student in a course
router.post('/:id/enroll', auth(['student']), courseController.enrollCourse);

// ============ TEACHER ROUTES ============
// GET /api/courses/teacher/courses - Get courses taught by this teacher
router.get('/teacher/courses', auth(['teacher']), courseController.getTeacherCourses);
// POST /api/courses - Create new course
router.post('/', auth(['teacher']), courseController.createCourse);

// ============ PUBLIC ROUTES (Cached) ============
// GET /api/courses - Get all available courses
router.get('/', cacheMiddleware(300), courseController.getAllCourses);

// ============ TEACHER/COURSE SPECIFIC ROUTES ============
// Teacher manages student enrollments
router.post('/:id/enroll', auth(['teacher']), courseController.enrollStudentByTeacher);
router.post('/:id/unenroll', auth(['teacher']), courseController.removeStudentByTeacher);

// ============ ATTENDANCE ROUTES (must be before /:id) ============
// Save attendance for a course
router.post('/:id/attendance', auth(['teacher']), courseController.saveAttendance);
// Get attendance records for a course
router.get('/:id/attendance', auth(['teacher', 'student']), courseController.getAttendance);

// ============ COURSE ID ROUTES (must be last) ============
// GET /api/courses/:id - Get course by ID
router.get('/:id', cacheMiddleware(300), courseController.getCourse);
// PUT /api/courses/:id - Update course details
router.put('/:id', auth(['teacher']), courseController.updateCourse);
// DELETE /api/courses/:id - Delete course
router.delete('/:id', auth(['teacher']), courseController.deleteCourse);

module.exports = router;