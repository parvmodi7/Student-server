/**
 * AI Controller
 * Optimized Gemini API calls with server-side caching to prevent key exhaustion
 */

const { callGemini, clearGeminiCache } = require('../services/geminiService');

/**
 * General AI chat endpoint
 * Cached responses to minimize Gemini API calls
 */
exports.chat = async (req, res) => {
  try {
    const { prompt, useJson } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const result = await callGemini(
      prompt,
      req.body.systemPrompt || 'You are a helpful educational assistant.',
      useJson || false
    );

    res.json({ result });
  } catch (error) {
    console.error('[AI CHAT ERROR]', error);
    res.status(500).json({ 
      error: error.message || 'AI service failed',
      retry: error.message?.includes('rate limit')
    });
  }
};

/**
 * Generate smart notifications for student
 * Uses caching to avoid repeated calls
 */
exports.getNotifications = async (req, res) => {
  try {
    const { Student, Assignment, Grade } = require('../models');
    const student = await Student.findOne({ userId: req.user.id });

    if (!student) {
      return res.status(403).json({ error: 'Student profile not found' });
    }

    // Get upcoming deadlines
    const upcomingAssignments = await Assignment.find({
      course: { $in: student.enrolledCourses },
      dueDate: { $gte: new Date(), $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      isPublished: true
    }).populate('course', 'name').limit(5);

    // Get recent grades
    const recentGrades = await Grade.find({
      student: student._id,
      gradedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    }).populate('course', 'name').limit(5);

    // Use AI to generate smart notifications
    const prompt = `Based on the following student data, generate 3-5 smart notifications with title, message, and urgency (High/Medium/Low):
    
Upcoming Assignments: ${JSON.stringify(upcomingAssignments.map(a => ({ course: a.course.name, title: a.title, due: a.dueDate })))}
Recent Grades: ${JSON.stringify(recentGrades.map(g => ({ course: g.course.name, grade: g.grade })))}

Return as JSON array with format: [{"title": "...", "message": "...", "urgency": "High/Medium/Low"}]`;

    const result = await callGemini(prompt, 'You are a notification assistant. Generate concise, actionable notifications.', true);
    
    res.json({ notifications: result, raw: { upcomingAssignments, recentGrades } });
  } catch (error) {
    console.error('[GET NOTIFICATIONS ERROR]', error);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
};

/**
 * Generate study predictions using AI
 */
exports.getPredictions = async (req, res) => {
  try {
    const { Student, Grade, Assignment } = require('../models');
    const student = await Student.findOne({ userId: req.user.id });

    if (!student) {
      return res.status(403).json({ error: 'Student profile not found' });
    }

    // Get historical data
    const grades = await Grade.find({ student: student._id })
      .populate('course', 'name credits');

    const prompt = `Analyze the following student academic data and generate predictions:
    
Current GPA: ${student.gpa}
Total Credits: ${student.totalCredits}
Grades: ${JSON.stringify(grades.map(g => ({ course: g.course?.name, percentage: g.percentage })))}

Return as JSON with:
- predictedGPA: number for next semester
- atRiskCourses: array of course names where student might struggle
- recommendedActions: array of strings with study recommendations
- studyHoursRecommendation: number of hours per week`;

    const result = await callGemini(prompt, 'You are an academic advisor. Provide data-driven predictions.', true);

    res.json({ predictions: result });
  } catch (error) {
    console.error('[GET PREDICTIONS ERROR]', error);
    res.status(500).json({ error: 'Failed to get predictions' });
  }
};

/**
 * AI-powered study assistant
 */
exports.studyAssistant = async (req, res) => {
  try {
    const { question, context } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const systemPrompt = `You are a knowledgeable study assistant. 
Course Context: ${context || 'General'}
Provide clear, educational answers. Use examples when helpful.`;

    const result = await callGemini(question, systemPrompt, false);

    res.json({ answer: result });
  } catch (error) {
    console.error('[STUDY ASSISTANT ERROR]', error);
    res.status(500).json({ error: 'Failed to get answer' });
  }
};

/**
 * Generate assignment feedback (Teacher)
 */
exports.generateFeedback = async (req, res) => {
  try {
    const { Assignment } = require('../models');
    const assignment = await Assignment.findById(req.body.assignmentId)
      .populate('submissions.student', 'firstName lastName');

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const submission = assignment.submissions.find(
      s => s.student._id.toString() === req.body.studentId
    );

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const prompt = `Grade and provide feedback for this assignment submission:
    
Assignment: ${assignment.title}
Description: ${assignment.description}
Total Points: ${assignment.totalPoints}
Submission: ${submission.content}

Provide:
- Suggested grade (number out of ${assignment.totalPoints})
- Detailed feedback
- Areas for improvement
- Strengths

Return as JSON: {"grade": number, "feedback": "...", "improvements": [...], "strengths": [...]}`;

    const result = await callGemini(prompt, 'You are an experienced teacher providing constructive feedback.', true);

    res.json({ feedback: result });
  } catch (error) {
    console.error('[GENERATE FEEDBACK ERROR]', error);
    res.status(500).json({ error: 'Failed to generate feedback' });
  }
};

/**
 * Clear AI cache (admin endpoint)
 */
exports.clearCache = async (req, res) => {
  try {
    clearGeminiCache();
    res.json({ message: 'AI cache cleared successfully' });
  } catch (error) {
    console.error('[CLEAR CACHE ERROR]', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
};