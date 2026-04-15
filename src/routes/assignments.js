/**
 * Assignment Routes
 * Public: get assignments | Protected: create, update, submit, grade
 * 
 * Public Endpoints:
 * GET /api/assignments           - Get all assignments (cached)
 * GET /api/assignments/:id       - Get assignment details
 * 
 * Student Endpoints:
 * GET /api/assignments/course/:courseId - Get assignments for a course
 * POST /api/assignments/:id/submit      - Submit assignment
 * 
 * Teacher Endpoints:
 * POST /api/assignments           - Create new assignment
 * PUT /api/assignments/:id       - Update assignment
 * GET /api/assignments/:id/submissions - Get all submissions for an assignment
 * POST /api/assignments/:id/grade       - Grade a submission
 */
const express = require('express');
const router = express.Router();
const { assignmentController } = require('../controllers');
const { auth, cacheMiddleware } = require('../middleware');

// ============ PUBLIC ROUTES (Cached) ============
// GET /api/assignments - Get all assignments
router.get('/', cacheMiddleware(180), assignmentController.getAllAssignments);
// GET /api/assignments/:id - Get assignment by ID
router.get('/:id', cacheMiddleware(180), assignmentController.getAssignment);

// ============ STUDENT ROUTES ============
// GET /api/assignments/course/:courseId - Get assignments for a specific course
router.get('/course/:courseId', auth(['student']), assignmentController.getCourseAssignments);
// POST /api/assignments/:id/submit - Submit assignment work
router.post('/:id/submit', auth(['student']), assignmentController.submitAssignment);

// ============ TEACHER ROUTES ============
// POST /api/assignments - Create new assignment
router.post('/', auth(['teacher']), assignmentController.createAssignment);
// PUT /api/assignments/:id - Update assignment
router.put('/:id', auth(['teacher']), assignmentController.updateAssignment);
// GET /api/assignments/:id/submissions - View all submissions for grading
router.get('/:id/submissions', auth(['teacher']), assignmentController.getSubmissions);
// POST /api/assignments/:id/grade - Grade a student submission
router.post('/:id/grade', auth(['teacher']), assignmentController.gradeSubmission);

module.exports = router;