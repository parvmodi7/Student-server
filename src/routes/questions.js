/**
 * Question Routes
 * Endpoints for managing exam questions and adaptive quiz
 * 
 * Student routes:
 * GET /api/questions/subjects              - Get available subjects with stats
 * GET /api/questions/practice/:subject     - Get MCQs by subject+difficulty (?difficulty=Easy)
 * POST /api/questions/submit               - Submit an answer
 * GET /api/questions/performance            - Get performance analytics
 * GET /api/questions/subject/:subject      - Legacy: Get questions by subject
 * GET /api/questions/course/:courseId      - Legacy: Get questions by course
 * 
 * Teacher routes:
 * GET /api/questions/teacher               - Get all teacher's questions
 * GET /api/questions/:id/answer            - Get question with answer
 * POST /api/questions                      - Create question
 * PUT /api/questions/:id                   - Update question
 * DELETE /api/questions/:id                - Delete question
 */
const express = require('express');
const router = express.Router();
const { questionController } = require('../controllers');
const { auth } = require('../middleware');

// Student routes — Adaptive quiz
router.get('/subjects', auth(['student']), questionController.getAvailableSubjects);
router.get('/practice/:subject', auth(['student']), questionController.getQuestionsByDifficulty);
router.post('/submit', auth(['student']), questionController.submitAnswer);
router.get('/performance', auth(['student']), questionController.getPerformanceStats);

// Student routes — Legacy
router.get('/subject/:subject', auth(['student']), questionController.getQuestionsBySubject);
router.get('/course/:courseId', auth(['student']), questionController.getQuestionsByCourse);

// Teacher routes — Manage questions
router.get('/teacher', auth(['teacher']), questionController.getTeacherQuestions);
router.get('/:id/answer', auth(['teacher']), questionController.getQuestionWithAnswer);
router.post('/', auth(['teacher']), questionController.createQuestion);
router.put('/:id', auth(['teacher']), questionController.updateQuestion);
router.delete('/:id', auth(['teacher']), questionController.deleteQuestion);

module.exports = router;
