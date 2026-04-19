/**
 * Question Controller
 * Handles CRUD operations for exam questions + adaptive quiz endpoints
 */
const { Question, Course, QuizAttempt, Student } = require('../models');
const { Gamification, LEVELS, ACHIEVEMENT_DEFINITIONS, Achievement } = require('../models/Gamification');

// Get questions by subject (for student exam — legacy)
exports.getQuestionsBySubject = async (req, res) => {
  try {
    const { subject } = req.params;
    
    const questions = await Question.find({ 
      subject: { $regex: new RegExp(subject, 'i') },
      isActive: true 
    }).populate('teacher', 'firstName lastName').select('-idealAnswer -explanation');

    res.json({ 
      questions: questions.map(q => ({
        _id: q._id,
        subject: q.subject,
        question: q.question,
        type: q.type,
        options: q.type === 'multiple-choice' ? q.options.map(o => ({ text: o.text })) : undefined,
        hint: q.hint,
        marks: q.marks,
        difficulty: q.difficulty
      })),
      total: questions.length 
    });
  } catch (error) {
    console.error('[GET QUESTIONS ERROR]', error);
    res.status(500).json({ error: 'Failed to get questions' });
  }
};

// Get questions by course (for student exam — legacy)
exports.getQuestionsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    
    const questions = await Question.find({ 
      course: courseId,
      isActive: true 
    }).populate('teacher', 'firstName lastName').select('-idealAnswer -explanation');

    res.json({ 
      questions: questions.map(q => ({
        _id: q._id,
        subject: q.subject,
        question: q.question,
        type: q.type,
        options: q.type === 'multiple-choice' ? q.options.map(o => ({ text: o.text })) : undefined,
        hint: q.hint,
        marks: q.marks,
        difficulty: q.difficulty
      })),
      total: questions.length 
    });
  } catch (error) {
    console.error('[GET QUESTIONS BY COURSE ERROR]', error);
    res.status(500).json({ error: 'Failed to get questions' });
  }
};

// Get MCQ questions by subject and difficulty (for adaptive quiz)
exports.getQuestionsByDifficulty = async (req, res) => {
  try {
    const { subject } = req.params;
    const { difficulty = 'Easy', limit = 10 } = req.query;
    const studentId = req.user.id;

    // Get IDs of questions already answered by this student for this subject+difficulty
    const answeredAttempts = await QuizAttempt.find({
      student: studentId,
      subject: { $regex: new RegExp(`^${subject}$`, 'i') },
      difficulty
    }).select('question');
    const answeredIds = answeredAttempts.map(a => a.question);

    // Find unanswered questions first, fall back to all questions if needed
    let questions = await Question.find({
      subject: { $regex: new RegExp(subject, 'i') },
      difficulty,
      type: 'multiple-choice',
      isActive: true,
      _id: { $nin: answeredIds }
    }).select('-idealAnswer -explanation').limit(parseInt(limit));

    // If not enough unanswered questions, include already answered ones
    if (questions.length < parseInt(limit)) {
      const remaining = parseInt(limit) - questions.length;
      const additionalQuestions = await Question.find({
        subject: { $regex: new RegExp(subject, 'i') },
        difficulty,
        type: 'multiple-choice',
        isActive: true,
        _id: { $in: answeredIds }
      }).select('-idealAnswer -explanation').limit(remaining);
      questions = [...questions, ...additionalQuestions];
    }

    res.json({
      questions: questions.map(q => ({
        _id: q._id,
        subject: q.subject,
        question: q.question,
        type: q.type,
        options: q.options.map(o => ({ text: o.text })),
        hint: q.hint,
        marks: q.marks,
        difficulty: q.difficulty
      })),
      total: questions.length,
      difficulty
    });
  } catch (error) {
    console.error('[GET QUESTIONS BY DIFFICULTY ERROR]', error);
    res.status(500).json({ error: 'Failed to get questions' });
  }
};

// Get available subjects with question counts
exports.getAvailableSubjects = async (req, res) => {
  try {
    const subjects = await Question.aggregate([
      { $match: { isActive: true, type: 'multiple-choice' } },
      {
        $group: {
          _id: '$subject',
          totalQuestions: { $sum: 1 },
          easyCount: { $sum: { $cond: [{ $eq: ['$difficulty', 'Easy'] }, 1, 0] } },
          mediumCount: { $sum: { $cond: [{ $eq: ['$difficulty', 'Medium'] }, 1, 0] } },
          hardCount: { $sum: { $cond: [{ $eq: ['$difficulty', 'Hard'] }, 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get student performance per subject
    const studentId = req.user.id;
    const stats = await QuizAttempt.aggregate([
      { $match: { student: new (require('mongoose').Types.ObjectId)(studentId) } },
      {
        $group: {
          _id: '$subject',
          attempted: { $sum: 1 },
          correct: { $sum: { $cond: ['$isCorrect', 1, 0] } }
        }
      }
    ]);

    const statsMap = {};
    stats.forEach(s => { statsMap[s._id] = s; });

    res.json({
      subjects: subjects.map(s => ({
        name: s._id,
        totalQuestions: s.totalQuestions,
        easyCount: s.easyCount,
        mediumCount: s.mediumCount,
        hardCount: s.hardCount,
        attempted: statsMap[s._id]?.attempted || 0,
        correct: statsMap[s._id]?.correct || 0,
        accuracy: statsMap[s._id] ? Math.round((statsMap[s._id].correct / statsMap[s._id].attempted) * 100) : 0
      }))
    });
  } catch (error) {
    console.error('[GET AVAILABLE SUBJECTS ERROR]', error);
    res.status(500).json({ error: 'Failed to get subjects' });
  }
};

// Submit an answer (student)
exports.submitAnswer = async (req, res) => {
  try {
    const { questionId, selectedOption, timeTaken } = req.body;
    const studentId = req.user.id;

    if (selectedOption === undefined || !questionId) {
      return res.status(400).json({ error: 'questionId and selectedOption are required' });
    }

    // Get question with answer
    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Check correctness
    const correctIndex = question.options.findIndex(o => o.isCorrect);
    const isCorrect = selectedOption === correctIndex;

    // Save attempt
    await QuizAttempt.create({
      student: studentId,
      subject: question.subject,
      question: questionId,
      selectedOption,
      isCorrect,
      difficulty: question.difficulty,
      timeTaken: timeTaken || 0
    });

    // Update gamification stats
    let gamification = await Gamification.findOne({ student: studentId });
    if (!gamification) {
      gamification = await Gamification.create({ student: studentId });
    }

    gamification.totalQuestionsAnswered += 1;
    if (isCorrect) {
      gamification.totalCorrectAnswers += 1;
      gamification.consecutiveCorrect += 1;
      gamification.xp += 10; // XP per correct answer
      gamification.weeklyXP += 10;
    } else {
      gamification.consecutiveCorrect = 0;
      gamification.xp += 2; // Small XP for attempting
      gamification.weeklyXP += 2;
    }

    // Update subject stats
    const subjectKey = question.subject.replace(/\./g, '_');
    const currentSubjectStats = gamification.subjectStats?.get(subjectKey) || { attempted: 0, correct: 0 };
    gamification.subjectStats.set(subjectKey, {
      attempted: currentSubjectStats.attempted + 1,
      correct: currentSubjectStats.correct + (isCorrect ? 1 : 0)
    });

    // Check level up
    const newLevel = LEVELS.find(l => gamification.xp >= l.minXP && (!LEVELS.find(next => next.level === l.level + 1) || gamification.xp < LEVELS.find(next => next.level === l.level + 1).minXP));
    if (newLevel && newLevel.level > gamification.level) {
      gamification.level = newLevel.level;
    }

    // Update streak
    const now = new Date();
    const lastActivity = gamification.lastActivityDate ? new Date(gamification.lastActivityDate) : null;
    const daysDiff = lastActivity ? Math.floor((now - lastActivity) / (1000 * 60 * 60 * 24)) : -1;
    if (daysDiff === 1) {
      gamification.currentStreak += 1;
      if (gamification.currentStreak > gamification.longestStreak) {
        gamification.longestStreak = gamification.currentStreak;
      }
    } else if (daysDiff > 1) {
      gamification.currentStreak = 1;
    } else if (daysDiff < 0) {
      gamification.currentStreak = 1;
    }
    gamification.lastActivityDate = now;

    await gamification.save();

    // Check for new achievements
    const newAchievements = [];
    for (const def of ACHIEVEMENT_DEFINITIONS) {
      const existing = await Achievement.findOne({ student: studentId, name: def.name });
      if (!existing && def.condition(gamification)) {
        const achievement = await Achievement.create({
          student: studentId,
          type: def.type,
          name: def.name,
          description: def.description,
          icon: def.icon,
          xpBonus: def.xpBonus
        });
        gamification.xp += def.xpBonus;
        gamification.achievements.push(achievement._id);
        newAchievements.push({ name: def.name, icon: def.icon, description: def.description, xpBonus: def.xpBonus });
      }
    }
    if (newAchievements.length > 0) {
      await gamification.save();
    }

    res.json({
      isCorrect,
      correctOptionIndex: correctIndex,
      explanation: question.explanation || '',
      xpEarned: isCorrect ? 10 : 2,
      newAchievements,
      stats: {
        totalAnswered: gamification.totalQuestionsAnswered,
        totalCorrect: gamification.totalCorrectAnswers,
        consecutiveCorrect: gamification.consecutiveCorrect,
        level: gamification.level,
        xp: gamification.xp
      }
    });
  } catch (error) {
    console.error('[SUBMIT ANSWER ERROR]', error);
    res.status(500).json({ error: 'Failed to submit answer' });
  }
};

// Get student performance stats
exports.getPerformanceStats = async (req, res) => {
  try {
    const studentId = req.user.id;

    // Overall stats
    const totalStats = await QuizAttempt.aggregate([
      { $match: { student: new (require('mongoose').Types.ObjectId)(studentId) } },
      {
        $group: {
          _id: null,
          totalAttempted: { $sum: 1 },
          totalCorrect: { $sum: { $cond: ['$isCorrect', 1, 0] } },
          avgTimeTaken: { $avg: '$timeTaken' }
        }
      }
    ]);

    // Per-subject stats
    const subjectStats = await QuizAttempt.aggregate([
      { $match: { student: new (require('mongoose').Types.ObjectId)(studentId) } },
      {
        $group: {
          _id: '$subject',
          attempted: { $sum: 1 },
          correct: { $sum: { $cond: ['$isCorrect', 1, 0] } },
          avgTime: { $avg: '$timeTaken' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Per-difficulty stats
    const difficultyStats = await QuizAttempt.aggregate([
      { $match: { student: new (require('mongoose').Types.ObjectId)(studentId) } },
      {
        $group: {
          _id: '$difficulty',
          attempted: { $sum: 1 },
          correct: { $sum: { $cond: ['$isCorrect', 1, 0] } }
        }
      }
    ]);

    // Recent attempts (last 20)
    const recentAttempts = await QuizAttempt.find({ student: studentId })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('question', 'question difficulty subject');

    const overall = totalStats[0] || { totalAttempted: 0, totalCorrect: 0, avgTimeTaken: 0 };

    // Find weak subjects (below 60% accuracy with at least 3 attempts)
    const weakSubjects = subjectStats
      .filter(s => s.attempted >= 3 && (s.correct / s.attempted) < 0.6)
      .map(s => s._id);

    res.json({
      overall: {
        totalAttempted: overall.totalAttempted,
        totalCorrect: overall.totalCorrect,
        accuracy: overall.totalAttempted > 0 ? Math.round((overall.totalCorrect / overall.totalAttempted) * 100) : 0,
        avgTimeTaken: Math.round(overall.avgTimeTaken || 0)
      },
      subjects: subjectStats.map(s => ({
        name: s._id,
        attempted: s.attempted,
        correct: s.correct,
        accuracy: Math.round((s.correct / s.attempted) * 100),
        avgTime: Math.round(s.avgTime || 0)
      })),
      difficulties: difficultyStats.map(d => ({
        level: d._id,
        attempted: d.attempted,
        correct: d.correct,
        accuracy: Math.round((d.correct / d.attempted) * 100)
      })),
      weakSubjects,
      recentAttempts: recentAttempts.map(a => ({
        question: a.question?.question,
        subject: a.subject,
        difficulty: a.difficulty,
        isCorrect: a.isCorrect,
        timeTaken: a.timeTaken,
        answeredAt: a.createdAt
      }))
    });
  } catch (error) {
    console.error('[GET PERFORMANCE STATS ERROR]', error);
    res.status(500).json({ error: 'Failed to get performance stats' });
  }
};

// Create question (Teacher only)
exports.createQuestion = async (req, res) => {
  try {
    const { course, subject, question, type, options, idealAnswer, hint, explanation, marks, difficulty } = req.body;

    if (!course || !subject || !question) {
      return res.status(400).json({ error: 'Course, subject and question are required' });
    }

    const newQuestion = await Question.create({
      course,
      teacher: req.user.id,
      subject,
      question,
      type: type || 'multiple-choice',
      options: type === 'multiple-choice' ? options : undefined,
      idealAnswer: idealAnswer || '',
      hint: hint || '',
      explanation: explanation || '',
      marks: marks || 10,
      difficulty: difficulty || 'Medium'
    });

    res.status(201).json({ 
      message: 'Question created successfully',
      question: newQuestion 
    });
  } catch (error) {
    console.error('[CREATE QUESTION ERROR]', error);
    res.status(500).json({ error: 'Failed to create question' });
  }
};

// Update question (Teacher only)
exports.updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const question = await Question.findById(id);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    if (question.teacher.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this question' });
    }

    Object.assign(question, updates);
    await question.save();

    res.json({ 
      message: 'Question updated successfully',
      question 
    });
  } catch (error) {
    console.error('[UPDATE QUESTION ERROR]', error);
    res.status(500).json({ error: 'Failed to update question' });
  }
};

// Delete question (Teacher only)
exports.deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    const question = await Question.findById(id);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    if (question.teacher.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this question' });
    }

    question.isActive = false;
    await question.save();

    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('[DELETE QUESTION ERROR]', error);
    res.status(500).json({ error: 'Failed to delete question' });
  }
};

// Get all questions for a teacher
exports.getTeacherQuestions = async (req, res) => {
  try {
    const { courseId } = req.query;
    
    const query = { teacher: req.user.id };
    if (courseId) {
      query.course = courseId;
    }

    const questions = await Question.find(query)
      .populate('course', 'name courseCode')
      .sort({ createdAt: -1 });

    res.json({ questions });
  } catch (error) {
    console.error('[GET TEACHER QUESTIONS ERROR]', error);
    res.status(500).json({ error: 'Failed to get questions' });
  }
};

// Get question with answer (for grading)
exports.getQuestionWithAnswer = async (req, res) => {
  try {
    const { id } = req.params;
    
    const question = await Question.findById(id).select('+idealAnswer');
    
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    res.json({ question });
  } catch (error) {
    console.error('[GET QUESTION WITH ANSWER ERROR]', error);
    res.status(500).json({ error: 'Failed to get question' });
  }
};
