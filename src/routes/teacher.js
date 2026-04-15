/**
 * Teacher Routes
 * Protected endpoints for teacher-specific data
 */
const express = require('express');
const router = express.Router();
const { teacherController } = require('../controllers');
const { auth, cacheMiddleware } = require('../middleware');

// Dashboard
router.get('/dashboard', auth(['teacher']), cacheMiddleware(60), teacherController.getDashboardData);

// Courses
router.get('/courses', auth(['teacher']), cacheMiddleware(300), teacherController.getDashboardData);
router.post('/courses', auth(['teacher']), teacherController.createCourse);
router.put('/courses/:courseId', auth(['teacher']), teacherController.updateCourse);

// Students
router.get('/students', auth(['teacher']), teacherController.getAllStudents);
router.get('/courses/:courseId/students', auth(['teacher']), teacherController.getCourseStudents);

// Grades
router.get('/courses/:courseId/grades', auth(['teacher']), teacherController.getCourseGrades);

// Assignments
router.post('/assignments', auth(['teacher']), teacherController.createAssignment);

module.exports = router;