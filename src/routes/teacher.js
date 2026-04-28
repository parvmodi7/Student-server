/**
 * Teacher Routes
 * Protected endpoints for teacher-specific data
 * 
 * Endpoints:
 * GET    /api/teacher/dashboard            - Get teacher dashboard
 * GET    /api/teacher/courses              - Get courses taught by teacher
 * POST   /api/teacher/courses              - Create new course
 * PUT    /api/teacher/courses/:courseId    - Update course
 * GET    /api/teacher/students             - Get all students
 * GET    /api/teacher/students/all         - Get all student users
 * POST   /api/teacher/students/:studentId/password - Set student password
 * GET    /api/teacher/courses/:courseId/students - Get students in a course
 * GET    /api/teacher/courses/:courseId/grades - Get grades for a course
 * POST   /api/teacher/assignments          - Create new assignment
 */
const express = require('express');
const router = express.Router();
const { teacherController } = require('../controllers');
const { auth, cacheMiddleware } = require('../middleware');

// GET /api/teacher/dashboard - Get teacher dashboard stats
router.get('/dashboard', auth(['teacher']), cacheMiddleware(60), teacherController.getDashboardData);

// GET /api/teacher/courses - Get courses taught by this teacher
router.get('/courses', auth(['teacher']), cacheMiddleware(300), teacherController.getDashboardData);

// POST /api/teacher/courses - Create a new course
router.post('/courses', auth(['teacher']), teacherController.createCourse);

// PUT /api/teacher/courses/:courseId - Update course details
router.put('/courses/:courseId', auth(['teacher']), teacherController.updateCourse);

// GET /api/teacher/students - Get all enrolled students
router.get('/students', auth(['teacher']), teacherController.getAllStudents);

// GET /api/teacher/students/all - Get all student user accounts
router.get('/students/all', auth(['teacher']), teacherController.getAllStudentUsers);

// POST /api/teacher/students/:studentId/password - Set/reset student password
router.post('/students/:studentId/password', auth(['teacher']), teacherController.setStudentPassword);

// GET /api/teacher/courses/:courseId/students - Get students enrolled in a course
router.get('/courses/:courseId/students', auth(['teacher']), teacherController.getCourseStudents);

// GET /api/teacher/courses/:courseId/grades - Get grades for a specific course
router.get('/courses/:courseId/grades', auth(['teacher']), teacherController.getCourseGrades);

// POST /api/teacher/assignments - Create a new assignment
router.post('/assignments', auth(['teacher']), teacherController.createAssignment);

// POST /api/teacher/students - Create a new student account
router.post('/students', auth(['teacher']), teacherController.createStudent);

// PUT /api/teacher/students/:studentId - Update student
router.put('/students/:studentId', auth(['teacher']), teacherController.updateStudent);

// DELETE /api/teacher/students/:studentId - Delete student
router.delete('/students/:studentId', auth(['teacher']), teacherController.deleteStudent);

// POST /api/teacher/results - Publish results with PDF
router.post('/results', auth(['teacher']), teacherController.publishResult);

// POST /api/teacher/notification - Send notification to all students
router.post('/notification', auth(['teacher']), teacherController.sendNotification);

// POST /api/teacher/pyq - Upload PYQ paper
router.post('/pyq', auth(['teacher']), teacherController.createPyq);

// GET /api/teacher/pyq/:courseId - Get PYQs for a course
router.get('/pyq/:courseId', auth(['teacher']), teacherController.getPyqsByCourse);

module.exports = router;