/**
 * Question Routes
 * Endpoints for managing exam questions
 * 
 * GET /api/questions/subject/:subject  - Get questions by subject (Student)
 * GET /api/questions/course/:courseId - Get questions by course (Student)
 * GET /api/questions/teacher          - Get all teacher's questions (Teacher)
 * GET /api/questions/:id/answer       - Get question with answer (for grading)
 * POST /api/questions                 - Create question (Teacher)
 * PUT /api/questions/:id             - Update question (Teacher)
 * DELETE /api/questions/:id           - Delete question (Teacher)
 */
const express = require('express');
const router = express.Router();
const { questionController } = require('../controllers');
const { auth } = require('../middleware');

// Student routes - Get questions (no ideal answer exposed)
router.get('/subject/:subject', auth(['student']), questionController.getQuestionsBySubject);
router.get('/course/:courseId', auth(['student']), questionController.getQuestionsByCourse);

// Teacher routes - Manage questions
router.get('/teacher', auth(['teacher']), questionController.getTeacherQuestions);
router.get('/:id/answer', auth(['teacher']), questionController.getQuestionWithAnswer);
router.post('/', auth(['teacher']), questionController.createQuestion);
router.put('/:id', auth(['teacher']), questionController.updateQuestion);
router.delete('/:id', auth(['teacher']), questionController.deleteQuestion);

module.exports = router;
