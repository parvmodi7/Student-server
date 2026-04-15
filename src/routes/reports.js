/**
 * Report Routes
 * Generate PDF reports for students and teachers
 * 
 * Student Endpoints:
 * GET /api/reports/student - Generate student report (transcript)
 * 
 * Teacher Endpoints:
 * GET /api/reports/course/:courseId - Generate course report
 */
const express = require('express');
const router = express.Router();
const { reportController } = require('../controllers');
const { auth } = require('../middleware');

// GET /api/reports/student - Generate PDF report for student's transcript/grades
router.get('/student', auth(['student']), reportController.generateStudentReport);

// GET /api/reports/course/:courseId - Generate PDF report for a course
router.get('/course/:courseId', auth(['teacher']), reportController.generateTeacherCourseReport);

module.exports = router;