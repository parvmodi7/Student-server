/**
 * Gamification Routes
 * XP, Streaks, Achievements, Leaderboard
 */
const express = require('express');
const router = express.Router();
const { gamificationController } = require('../controllers');
const { auth, cacheMiddleware } = require('../middleware');

router.get('/profile', auth(['student']), cacheMiddleware(60), gamificationController.getProfile);
router.post('/activity', auth(['student']), gamificationController.recordActivity);
router.get('/leaderboard', auth(['student']), cacheMiddleware(300), gamificationController.getLeaderboard);
router.get('/challenges', auth(['student']), cacheMiddleware(300), gamificationController.getChallenges);
router.post('/claim-reward', auth(['student']), gamificationController.claimReward);

module.exports = router;