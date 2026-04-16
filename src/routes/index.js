/**
 * Routes Index
 * Import and export all route modules
 */
const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const userRoutes = require('./user');
const courseRoutes = require('./courses');
const assignmentRoutes = require('./assignments');
const gradeRoutes = require('./grades');
const scheduleRoutes = require('./schedules');
const aiRoutes = require('./ai');
const studentRoutes = require('./student');
const teacherRoutes = require('./teacher');
const reportRoutes = require('./reports');
const gamificationRoutes = require('./gamification');
const questionRoutes = require('./questions');

router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/student', studentRoutes);
router.use('/teacher', teacherRoutes);
router.use('/courses', courseRoutes);
router.use('/assignments', assignmentRoutes);
router.use('/grades', gradeRoutes);
router.use('/schedules', scheduleRoutes);
router.use('/ai', aiRoutes);
router.use('/reports', reportRoutes);
router.use('/gamification', gamificationRoutes);
router.use('/questions', questionRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;