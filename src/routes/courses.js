/**
 * Course Routes
 * Public: get courses
 * Protected: create, update, enroll (role-based)
 */
const express = require('express');
const router = express.Router();
const { courseController } = require('../controllers');
const { auth, cacheMiddleware } = require('../middleware');

// Public - cached
router.get('/', cacheMiddleware(300), courseController.getAllCourses);
router.get('/:id', cacheMiddleware(300), courseController.getCourse);

// Protected - students
router.get('/student/courses', auth(['student']), courseController.getStudentCourses);
router.post('/:id/enroll', auth(['student']), courseController.enrollCourse);

// Protected - teachers
router.get('/teacher/courses', auth(['teacher']), courseController.getTeacherCourses);
router.post('/', auth(['teacher']), courseController.createCourse);
router.put('/:id', auth(['teacher']), courseController.updateCourse);

module.exports = router;