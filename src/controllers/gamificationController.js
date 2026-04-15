/**
 * Gamification Controller
 * XP, Streaks, Achievements, Leaderboard
 */

const { Student, Assignment, Grade } = require('../models');
const { Gamification, Achievement, XP_CONFIG, LEVELS, ACHIEVEMENT_DEFINITIONS } = require('../models/Gamification');

exports.getProfile = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      return res.status(403).json({ error: 'Student profile not found' });
    }

    let gamification = await Gamification.findOne({ student: student._id })
      .populate('achievements');

    if (!gamification) {
      gamification = await Gamification.create({ student: student._id });
    }

    const currentLevel = LEVELS.find(l => l.level === gamification.level) || LEVELS[0];
    const nextLevel = LEVELS.find(l => l.level === gamification.level + 1);
    const xpToNext = nextLevel ? nextLevel.minXP - gamification.xp : 0;
    const progressPercent = nextLevel 
      ? ((gamification.xp - currentLevel.minXP) / (nextLevel.minXP - currentLevel.minXP)) * 100
      : 100;

    res.json({
      gamification: {
        xp: gamification.xp,
        level: gamification.level,
        title: currentLevel.title,
        currentStreak: gamification.currentStreak,
        longestStreak: gamification.longestStreak,
        totalAssignmentsCompleted: gamification.totalAssignmentsCompleted,
        totalStudyHours: gamification.totalStudyHours,
        weeklyXP: gamification.weeklyXP,
        xpToNextLevel: xpToNext,
        progressPercent: progressPercent.toFixed(1),
        achievements: gamification.achievements,
        badges: gamification.badges
      }
    });
  } catch (error) {
    console.error('[GET GAMIFICATION PROFILE ERROR]', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
};

exports.recordActivity = async (req, res) => {
  try {
    const { activityType, points } = req.body;
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      return res.status(403).json({ error: 'Student profile not found' });
    }

    let gamification = await Gamification.findOne({ student: student._id });
    if (!gamification) {
      gamification = await Gamification.create({ student: student._id });
    }

    const now = new Date();
    const lastActivity = gamification.lastActivityDate ? new Date(gamification.lastActivityDate) : null;
    const daysDiff = lastActivity ? Math.floor((now - lastActivity) / (1000 * 60 * 60 * 24)) : -1;

    // Update streak
    if (daysDiff === 1) {
      gamification.currentStreak += 1;
      if (gamification.currentStreak > gamification.longestStreak) {
        gamification.longestStreak = gamification.currentStreak;
      }
    } else if (daysDiff > 1) {
      gamification.currentStreak = 1;
    } else if (daysDiff < 0 && daysDiff !== -1) {
      gamification.currentStreak = 1;
    }

    // Update XP based on activity
    const earnedXP = points || XP_CONFIG[activityType] || 10;
    gamification.xp += earnedXP;
    gamification.weeklyXP += earnedXP;

    // Update activity-specific stats
    if (activityType === 'submitAssignment') {
      gamification.totalAssignmentsCompleted += 1;
    } else if (activityType === 'study') {
      gamification.totalStudyHours += (points / 60); // Assume points = minutes, convert to hours
    }

    // Reset weekly XP if new week
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (!gamification.weeklyResetDate || gamification.weeklyResetDate < weekAgo) {
      gamification.weeklyXP = earnedXP;
      gamification.weeklyResetDate = now;
    }

    // Check for level up
    const newLevel = LEVELS.find(l => gamification.xp >= l.minXP && (!LEVELS.find(next => next.level === l.level + 1) || gamification.xp < LEVELS.find(next => next.level === l.level + 1).minXP));
    if (newLevel && newLevel.level > gamification.level) {
      gamification.level = newLevel.level;
    }

    gamification.lastActivityDate = now;
    await gamification.save();

    // Check for new achievements
    const newAchievements = await checkAchievements(gamification);

    res.json({
      message: 'Activity recorded',
      xpEarned: earnedXP,
      totalXP: gamification.xp,
      level: gamification.level,
      newAchievements
    });
  } catch (error) {
    console.error('[RECORD ACTIVITY ERROR]', error);
    res.status(500).json({ error: 'Failed to record activity' });
  }
};

exports.getLeaderboard = async (req, res) => {
  try {
    const { period } = req.query; // 'weekly' or 'all'
    
    let sortField = 'xp';
    if (period === 'weekly') {
      sortField = 'weeklyXP';
    }

    const leaderboard = await Gamification.find()
      .populate('student', 'studentId')
      .sort({ [sortField]: -1 })
      .limit(20)
      .lean();

    const student = await Student.findOne({ userId: req.user.id });
    const userRank = leaderboard.findIndex(l => l.student?._id?.toString() === student?._id?.toString()) + 1;

    const formattedLeaderboard = leaderboard.map((entry, index) => {
      const level = LEVELS.find(l => l.level === entry.level) || LEVELS[0];
      return {
        rank: index + 1,
        studentId: entry.student?.studentId || 'Unknown',
        xp: entry[sortField] || 0,
        level: entry.level,
        title: level.title,
        streak: entry.currentStreak
      };
    });

    res.json({
      leaderboard: formattedLeaderboard,
      userRank: userRank || 'Unranked',
      period: period || 'all'
    });
  } catch (error) {
    console.error('[GET LEADERBOARD ERROR]', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
};

exports.getChallenges = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      return res.status(403).json({ error: 'Student profile not found' });
    }

    const gamification = await Gamification.findOne({ student: student._id });
    
    // Generate weekly challenges if none exist
    let challenges = gamification?.challenges || [];
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    if (challenges.length === 0) {
      challenges = [
        { id: 'ch1', title: 'Assignment Hunter', description: 'Submit 5 assignments this week', target: 5, progress: 0, completed: false, expiresAt: weekFromNow },
        { id: 'ch2', title: 'Study Streak', description: 'Maintain a 3-day streak', target: 3, progress: 0, completed: false, expiresAt: weekFromNow },
        { id: 'ch3', title: 'XP Champion', description: 'Earn 200 XP this week', target: 200, progress: 0, completed: false, expiresAt: weekFromNow }
      ];
    }

    res.json({ challenges });
  } catch (error) {
    console.error('[GET CHALLENGES ERROR]', error);
    res.status(500).json({ error: 'Failed to get challenges' });
  }
};

exports.claimReward = async (req, res) => {
  try {
    const { rewardId } = req.body;
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      return res.status(403).json({ error: 'Student profile not found' });
    }

    const gamification = await Gamification.findOne({ student: student._id });
    if (!gamification || gamification.xp < 100) {
      return res.status(400).json({ error: 'Not enough XP' });
    }

    // Deduct XP and add badge
    gamification.xp -= 100;
    gamification.badges.push({
      name: 'Custom Avatar',
      icon: '🎨',
      earnedAt: new Date()
    });
    await gamification.save();

    res.json({ message: 'Reward claimed!', remainingXP: gamification.xp });
  } catch (error) {
    console.error('[CLAIM REWARD ERROR]', error);
    res.status(500).json({ error: 'Failed to claim reward' });
  }
};

async function checkAchievements(gamification) {
  const newAchievements = [];
  
  for (const def of ACHIEVEMENT_DEFINITIONS) {
    const existing = await Achievement.findOne({
      student: gamification.student,
      name: def.name
    });

    if (!existing && def.condition(gamification)) {
      const achievement = await Achievement.create({
        student: gamification.student,
        type: def.type,
        name: def.name,
        description: def.description,
        icon: def.icon,
        xpBonus: def.xpBonus
      });
      
      gamification.xp += def.xpBonus;
      gamification.achievements.push(achievement._id);
      newAchievements.push(achievement);
    }
  }

  if (newAchievements.length > 0) {
    await gamification.save();
  }

  return newAchievements;
}