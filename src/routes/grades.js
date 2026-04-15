/**
 * Grade Routes
 * Protected endpoints for grade management (role-based)
 * 
 * Student Endpoints:
 * GET /api/grades           - Get all grades for student
 * GET /api/grades/gpa      - Get GPA calculation
 * 
 * Teacher Endpoints:
 * GET /api/grades/course/:courseId - Get grades for a specific course
 */
const express = require('express');
const router = express.Router();
const { gradeController } = require('../controllers');
const { auth, cacheMiddleware } = require('../middleware');

// ============ STUDENT ROUTES ============
// GET /api/grades - Get all grades for logged-in student
router.get('/', auth(['student']), cacheMiddleware(300), gradeController.getStudentGrades);
// GET /api/grades/gpa - Calculate and return student's GPA
router.get('/gpa', auth(['student']), gradeController.getGPA);

// ============ TEACHER ROUTES ============
// GET /api/grades/course/:courseId - Get all grades for a course
router.get('/course/:courseId', auth(['teacher']), gradeController.getCourseGrades);

module.exports = router;