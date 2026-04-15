/**
 * Gamification Models
 * XP, Streaks, Achievements, Levels
 */

const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['streak', 'grade', 'assignment', 'attendance', 'milestone', 'special'],
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  icon: String,
  earnedAt: {
    type: Date,
    default: Date.now
  },
  xpBonus: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

const gamificationSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    unique: true,
    index: true
  },
  xp: {
    type: Number,
    default: 0
  },
  level: {
    type: Number,
    default: 1
  },
  currentStreak: {
    type: Number,
    default: 0
  },
  longestStreak: {
    type: Number,
    default: 0
  },
  lastActivityDate: {
    type: Date
  },
  totalAssignmentsCompleted: {
    type: Number,
    default: 0
  },
  totalStudyHours: {
    type: Number,
    default: 0
  },
  weeklyXP: {
    type: Number,
    default: 0
  },
  weeklyResetDate: {
    type: Date
  },
  achievements: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Achievement'
  }],
  badges: [{
    name: String,
    icon: String,
    earnedAt: Date
  }],
  challenges: [{
    id: String,
    title: String,
    description: String,
    target: Number,
    progress: Number,
    completed: Boolean,
    expiresAt: Date
  }]
}, { timestamps: true });

const XP_CONFIG = {
  submitAssignment: 20,
  onTimeSubmission: 30,
  goodGrade: 50,
  perfectScore: 100,
  dailyLogin: 5,
  completeStudyPlan: 30,
  achieveStreak: 25,
  attendClass: 10
};

const LEVELS = [
  { level: 1, minXP: 0, title: 'Freshman' },
  { level: 2, minXP: 100, title: 'Sophomore' },
  { level: 3, minXP: 300, title: 'Junior' },
  { level: 4, minXP: 600, title: 'Senior' },
  { level: 5, minXP: 1000, title: 'Graduate' },
  { level: 6, minXP: 1500, title: 'Master' },
  { level: 7, minXP: 2200, title: 'Doctor' },
  { level: 8, minXP: 3000, title: 'Professor' },
  { level: 9, minXP: 4000, title: 'Legend' },
  { level: 10, minXP: 5500, title: 'Grandmaster' }
];

const ACHIEVEMENT_DEFINITIONS = [
  { type: 'streak', name: 'First Step', description: 'Complete 3-day streak', icon: '🔥', xpBonus: 50, condition: (g) => g.currentStreak >= 3 },
  { type: 'streak', name: 'Week Warrior', description: 'Complete 7-day streak', icon: '💪', xpBonus: 100, condition: (g) => g.currentStreak >= 7 },
  { type: 'streak', name: 'Month Master', description: 'Complete 30-day streak', icon: '🏆', xpBonus: 500, condition: (g) => g.currentStreak >= 30 },
  { type: 'grade', name: 'Grade A', description: 'Get your first A grade', icon: '⭐', xpBonus: 50, condition: (g) => g.totalAssignmentsCompleted >= 1 },
  { type: 'grade', name: 'Perfect Score', description: 'Score 100% on any assignment', icon: '💯', xpBonus: 150, condition: (g) => g.totalAssignmentsCompleted >= 5 },
  { type: 'assignment', name: 'First Submission', description: 'Submit your first assignment', icon: '📝', xpBonus: 25, condition: (g) => g.totalAssignmentsCompleted >= 1 },
  { type: 'assignment', name: 'Productive', description: 'Submit 10 assignments', icon: '📚', xpBonus: 100, condition: (g) => g.totalAssignmentsCompleted >= 10 },
  { type: 'assignment', name: 'Assignment Pro', description: 'Submit 50 assignments', icon: '🎓', xpBonus: 300, condition: (g) => g.totalAssignmentsCompleted >= 50 },
  { type: 'attendance', name: 'Present', description: 'Attend your first class', icon: '✅', xpBonus: 20, condition: (g) => g.totalStudyHours >= 1 },
  { type: 'attendance', name: 'Dedicated', description: 'Study for 10 hours', icon: '📖', xpBonus: 100, condition: (g) => g.totalStudyHours >= 10 },
  { type: 'milestone', name: 'Level Up', description: 'Reach level 5', icon: '⬆️', xpBonus: 200, condition: (g) => g.level >= 5 },
  { type: 'milestone', name: 'XP Hunter', description: 'Earn 1000 XP', icon: '🎯', xpBonus: 200, condition: (g) => g.xp >= 1000 }
];

module.exports = {
  Achievement: mongoose.model('Achievement', achievementSchema),
  Gamification: mongoose.model('Gamification', gamificationSchema),
  XP_CONFIG,
  LEVELS,
  ACHIEVEMENT_DEFINITIONS
};