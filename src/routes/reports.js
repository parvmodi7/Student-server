/**
 * Report Routes
 * Generate PDF reports for students and teachers
 */
const express = require('express');
const router = express.Router();
const { reportController } = require('../controllers');
const { auth } = require('../middleware');

router.get('/student', auth(['student']), reportController.generateStudentReport);
router.get('/course/:courseId', auth(['teacher']), reportController.generateTeacherCourseReport);

module.exports = router;