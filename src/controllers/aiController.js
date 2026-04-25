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
    const student = await Student.findById(req.user.id);

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
    const student = await Student.findById(req.user.id);

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
    console.log('[STUDY] studyAssistant called with:', { question: question?.slice(0, 50), context, user: req.user?.id });

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const isPlaintext = context === 'plaintext';
    const isFlashcards = context?.toLowerCase().includes('cards') || context?.toLowerCase().includes('flashcard');
    const isQuestions = context?.toLowerCase().includes('question') || context?.toLowerCase().includes('exam');
    const isResources = context?.toLowerCase().includes('resource');
    const isResume = context?.toLowerCase().includes('resume');
    const isEmail = context?.toLowerCase().includes('email');
    const isConcept = context?.toLowerCase().includes('concept') || context?.toLowerCase().includes('explain');
    const isTriage = context?.toLowerCase().includes('triage') || context?.toLowerCase().includes('80/20');
    const isInterview = context?.toLowerCase().includes('interview');

    console.log(`[STUDY] context="${context}" isFlashcards=${isFlashcards} isQuestions=${isQuestions}`);

    let systemPrompt;
    let jsonFormat = !isPlaintext;

    if (isPlaintext) {
      systemPrompt = `You are a supportive friend. Write naturally like you're talking to someone you care about. Be warm, personal, and encouraging.`;
    } else if (isFlashcards) {
      systemPrompt = `You are a helpful study assistant. Generate flashcards for active recall learning.
Return JSON in this exact format:
{"cards": [{"front": "question/term", "back": "answer/definition"}]}`;
    } else if (isQuestions) {
      systemPrompt = `You are a helpful study assistant. Generate practice exam questions.
Return JSON in this exact format:
{"questions": [{"id": "q1", "question": "question text", "type": "theory/application", "marks": 10, "hint": "optional hint", "idealAnswer": "model answer"}]}`;
    } else if (isResources) {
      systemPrompt = `You are a helpful study assistant. Curate learning resources.
Return JSON in this exact format:
{"resources": [{"name": "resource name", "description": "why it's helpful", "url": "optional link"}]}`;
    } else if (isResume) {
      systemPrompt = `You are a helpful career assistant. Generate resume bullet points.
Return JSON in this exact format:
{"bullets": [{"text": "action verb + achievement + metrics"}]}`;
    } else if (isEmail) {
      systemPrompt = `You are a helpful academic assistant. Write professional emails.
Return JSON in this exact format:
{"text": "full email message"}`;
    } else if (isConcept) {
      systemPrompt = `You are a helpful study assistant. Explain concepts simply.
Return JSON in this exact format:
{"conceptName": "concept", "explanation": "plain english", "analogy": "relatable analogy"}`;
    } else if (isTriage) {
      systemPrompt = `You are a helpful study assistant. Apply the 80/20 rule for exam prep.
Return JSON in this exact format:
{"topics": [{"name": "topic name", "whyHighYield": "why it matters", "quickTip": "quick tip"}]}`;
    } else if (isInterview) {
      systemPrompt = `You are a helpful technical interview prep assistant. Generate interview questions.
Return JSON in this exact format:
{"subject": "subject", "difficulty": "Easy/Medium/Hard", "question": "question", "idealAnswerKeyPoints": ["point1", "point2"]}`;
    } else {
      systemPrompt = `You are a helpful study assistant. 
Course Context: ${context || 'General'}
Provide clear, educational answers. Return JSON format when applicable.`;
    }

    const result = await callGemini(question, systemPrompt, jsonFormat);

    res.json({ answer: result });
  } catch (error) {
    console.error('[STUDY ASSISTANT ERROR]', error.message, error.stack);
    const errorMsg = error.message || 'Failed to get answer';
    const isQuotaError = errorMsg.includes('quota') || errorMsg.includes('429');
    res.status(isQuotaError ? 429 : 500).json({ error: errorMsg, quotaExceeded: isQuotaError });
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
 * Generate personalized study plan based on quiz performance
 */
exports.generatePersonalizedStudyPlan = async (req, res) => {
  try {
    const { Student, QuizAttempt } = require('../models');
    const student = await Student.findById(req.user.id);

    if (!student) {
      return res.status(403).json({ error: 'Student profile not found' });
    }

    // Get performance stats
    const subjectStats = await QuizAttempt.aggregate([
      { $match: { student: student._id } },
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

    const difficultyStats = await QuizAttempt.aggregate([
      { $match: { student: student._id } },
      {
        $group: {
          _id: { subject: '$subject', difficulty: '$difficulty' },
          attempted: { $sum: 1 },
          correct: { $sum: { $cond: ['$isCorrect', 1, 0] } }
        }
      }
    ]);

    if (subjectStats.length === 0) {
      return res.json({
        studyPlan: {
          strategySummary: 'Start by taking some quizzes in the Dojo to get personalized recommendations!',
          schedule: [],
          weakAreas: [],
          focusSubjects: []
        }
      });
    }

    const subjectSummary = subjectStats.map(s => ({
      subject: s._id,
      attempted: s.attempted,
      correct: s.correct,
      accuracy: Math.round((s.correct / s.attempted) * 100),
      avgTimeSeconds: Math.round(s.avgTime || 0)
    }));

    const difficultySummary = difficultyStats.map(d => ({
      subject: d._id.subject,
      difficulty: d._id.difficulty,
      attempted: d.attempted,
      correct: d.correct,
      accuracy: Math.round((d.correct / d.attempted) * 100)
    }));

    const weakSubjects = subjectSummary.filter(s => s.accuracy < 60);

    const prompt = `You are an AI academic advisor. Based on the following student quiz performance data, generate a personalized weekly study plan.

Student Performance by Subject:
${JSON.stringify(subjectSummary, null, 2)}

Performance by Difficulty Level:
${JSON.stringify(difficultySummary, null, 2)}

Weak Subjects (below 60% accuracy): ${weakSubjects.map(s => s.subject).join(', ') || 'None'}

Create a study plan that:
1. Prioritizes weak subjects with more study time
2. Suggests specific focus areas based on difficulty gaps
3. Includes a mix of review and practice
4. Is practical and actionable for a student

Return JSON with this exact format:
{
  "strategySummary": "Brief overview of the study strategy",
  "focusSubjects": ["subject1", "subject2"],
  "weakAreas": [{"subject": "...", "issue": "...", "recommendation": "..."}],
  "schedule": [
    {
      "day": "Monday",
      "tasks": [
        {"action": "task description", "subject": "subject name", "duration": "30 min", "reason": "why this matters", "difficulty": "Easy/Medium/Hard"}
      ]
    }
  ]
}`;

    const result = await callGemini(prompt, 'You are an expert academic advisor. Create data-driven, personalized study plans.', true);

    res.json({ studyPlan: result });
  } catch (error) {
    console.error('[GENERATE STUDY PLAN ERROR]', error);
    res.status(500).json({ error: 'Failed to generate study plan' });
  }
};

/**
 * AI Advisor Chat — dedicated conversational endpoint
 * Rich persona prompts, conversation memory, student context
 */
exports.advisorChat = async (req, res) => {
  try {
    const { message, persona, history, studentContext } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Build student context string from real data
    let contextBlock = '';
    if (studentContext) {
      const parts = [];
      if (studentContext.gpa != null) parts.push(`Current GPA: ${studentContext.gpa}`);
      if (studentContext.courses?.length) {
        parts.push(`Enrolled courses: ${studentContext.courses.map(c => {
          let s = c.name || c;
          if (c.grade) s += ` (grade: ${c.grade}%)`;
          return s;
        }).join(', ')}`);
      }
      if (studentContext.assignments?.length) {
        parts.push(`Upcoming assignments: ${studentContext.assignments.map(a => `${a.title || a} (due: ${a.dueDate || 'soon'})`).join(', ')}`);
      }
      if (studentContext.totalCredits) parts.push(`Total credits: ${studentContext.totalCredits}`);
      if (studentContext.attendance) parts.push(`Attendance: ${studentContext.attendance}%`);
      if (parts.length) contextBlock = `\n\nSTUDENT ACADEMIC DATA:\n${parts.join('\n')}`;
    }

    // Rich persona-specific system prompts
    const personaPrompts = {
      "Supportive Mentor": `You are a warm, encouraging academic mentor who genuinely cares about the student's wellbeing and success. Your approach:
- Be empathetic and supportive — validate their feelings before giving advice
- Celebrate small wins and progress
- Offer practical, actionable suggestions with a positive spin
- If they're struggling, normalize it and share that setbacks are part of learning
- Use a friendly, conversational tone — like a wise older sibling
- When discussing grades or performance, focus on growth potential, not deficits
- Suggest specific study techniques, time management tips, or resources when relevant${contextBlock}`,

      "Socratic Tutor": `You are a Socratic tutor who helps students discover answers through guided questioning. Your approach:
- NEVER give direct answers — instead, ask thought-provoking questions that lead the student to the insight
- Break complex problems into smaller, manageable questions
- When a student is stuck, provide a small hint wrapped in a question
- Acknowledge good reasoning and gently redirect wrong paths
- Use phrases like "What do you think would happen if...?", "Can you think of a case where...?", "How does that connect to...?"
- If the student explicitly asks you to just explain something, you may give a brief explanation followed by a follow-up question
- Focus on building critical thinking skills${contextBlock}`,

      "Tough Love Coach": `You are a strict, no-nonsense academic coach who pushes students to their full potential. Your approach:
- Be direct and honest — don't sugarcoat poor performance
- Set high expectations and hold the student accountable
- Challenge excuses and procrastination firmly but fairly
- Give concrete, actionable deadlines and steps — no vague advice
- Use motivating language: "You're capable of more than this", "No excuses, let's fix this"
- When they do well, acknowledge it briefly, then push for the next level
- Focus on discipline, consistency, and results
- If GPA or grades are low, address it head-on with a recovery plan${contextBlock}`,

      "Career Recruiter": `You are a tech industry recruiter and career advisor who helps students become job-ready. Your approach:
- Evaluate everything through the lens of "Will this help you get hired?"
- Connect coursework to real industry skills and job descriptions
- Suggest portfolio projects, internship strategies, and networking tips
- Review or help craft resume bullet points, cover letters, and LinkedIn profiles
- Share industry trends and in-demand skills
- Give interview preparation advice (behavioral + technical)
- Be professional but approachable — like a recruiter who's genuinely invested in the candidate
- Relate their current courses and grades to career opportunities${contextBlock}`
    };

    const systemPrompt = personaPrompts[persona] || personaPrompts["Supportive Mentor"];

    // Build conversation with history for memory
    let conversationPrompt = '';
    if (history && history.length > 0) {
      // Include last 10 messages for context
      const recentHistory = history.slice(-10);
      conversationPrompt = 'CONVERSATION SO FAR:\n';
      recentHistory.forEach(msg => {
        const role = msg.role === 'user' ? 'Student' : 'You';
        conversationPrompt += `${role}: ${typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}\n`;
      });
      conversationPrompt += `\nStudent: ${message}\n\nRespond as the advisor. Keep your response focused, helpful, and under 300 words unless the student asks for something detailed.`;
    } else {
      conversationPrompt = `Student: ${message}\n\nRespond as the advisor. Keep your response focused, helpful, and under 300 words unless the student asks for something detailed.`;
    }

    const result = await callGemini(conversationPrompt, systemPrompt, false);

    res.json({ reply: typeof result === 'string' ? result : JSON.stringify(result) });
  } catch (error) {
    console.error('[ADVISOR CHAT ERROR]', error.message);
    const isQuotaError = error.message?.includes('quota') || error.message?.includes('429');
    res.status(isQuotaError ? 429 : 500).json({
      error: isQuotaError ? 'AI is busy right now. Please try again in a moment.' : 'Failed to get advisor response. Please try again.',
      quotaExceeded: isQuotaError
    });
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