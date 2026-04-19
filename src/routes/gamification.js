/**
 * Gamification Routes
 * XP, Streaks, Achievements, Leaderboard (student-only)
 * 
 * Endpoints:
 * GET  /api/gamification/profile       - Get student's XP, level, achievements
 * POST /api/gamification/activity      - Record activity (earn XP)
 * GET  /api/gamification/leaderboard  - Get class leaderboard
 * GET  /api/gamification/challenges   - Get active challenges
 * POST /api/gamification/claim-reward - Claim a reward
 */
const express = require('express');
const router = express.Router();
const { gamificationController } = require('../controllers');
const { auth, cacheMiddleware } = require('../middleware');

// GET /api/gamification/profile - Get XP, level, streak, achievements
router.get('/profile', auth(['student']), gamificationController.getProfile);

// POST /api/gamification/activity - Record an activity to earn XP (submit assignment, etc.)
router.post('/activity', auth(['student']), gamificationController.recordActivity);

// GET /api/gamification/leaderboard - Get weekly/all-time leaderboard
router.get('/leaderboard', auth(['student']), cacheMiddleware(300), gamificationController.getLeaderboard);

// GET /api/gamification/challenges - Get active challenges
router.get('/challenges', auth(['student']), cacheMiddleware(300), gamificationController.getChallenges);

// POST /api/gamification/claim-reward - Claim earned reward
router.post('/claim-reward', auth(['student']), gamificationController.claimReward);

module.exports = router;