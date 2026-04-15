/**
 * Assignment Routes
 * Public: get assignments
 * Protected: create, update, submit, grade (role-based)
 */
const express = require('express');
const router = express.Router();
const { assignmentController } = require('../controllers');
const { auth, cacheMiddleware } = require('../middleware');

// Public - cached
router.get('/', cacheMiddleware(180), assignmentController.getAllAssignments);
router.get('/:id', cacheMiddleware(180), assignmentController.getAssignment);

// Student routes
router.get('/course/:courseId', auth(['student']), assignmentController.getCourseAssignments);
router.post('/:id/submit', auth(['student']), assignmentController.submitAssignment);

// Teacher routes
router.post('/', auth(['teacher']), assignmentController.createAssignment);
router.put('/:id', auth(['teacher']), assignmentController.updateAssignment);
router.get('/:id/submissions', auth(['teacher']), assignmentController.getSubmissions);
router.post('/:id/grade', auth(['teacher']), assignmentController.gradeSubmission);

module.exports = router;