/**
 * Feedback Controller
 * Handles student feedback submission, AI analysis, and automated responses
 * Uses Gemini for sentiment analysis + response generation
 * Uses Resend for email delivery
 */

const { Student, Feedback } = require('../models');
const { callGemini } = require('../services/geminiService');

/**
 * Submit feedback / query (Student)
 * POST /api/feedback
 * Body: { query: string }
 */
exports.submitFeedback = async (req, res) => {
  try {
    const student = await Student.findById(req.user.id);
    if (!student) {
      return res.status(403).json({ error: 'Student profile not found' });
    }

    const { query } = req.body;
    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'Query/feedback text is required' });
    }

    if (query.length > 2000) {
      return res.status(400).json({ error: 'Query must be under 2000 characters' });
    }

    // Create feedback entry with pending status
    const feedback = await Feedback.create({
      student: student._id,
      query: query.trim(),
      status: 'processing',
    });

    // Run AI analysis asynchronously but wait for it
    try {
      const aiPrompt = `You are an AI assistant for an educational institution. Analyze the following student feedback/query and provide:

STUDENT FEEDBACK:
"${query.trim()}"

Analyze this and return a JSON response with:
{
  "category": "academic" | "complaint" | "suggestion" | "query" | "feedback" | "technical" | "other",
  "sentiment": "positive" | "neutral" | "negative" | "urgent",
  "priority": "low" | "medium" | "high" | "critical",
  "summary": "A concise 1-2 sentence summary of the feedback",
  "response": "A helpful, empathetic, and professional response to the student (2-4 sentences). Address their concern directly. If it's a query, answer it. If it's a complaint, acknowledge it and suggest next steps. If it's feedback, thank them.",
  "shouldFlag": true/false (flag if highly negative, urgent, safety-related, or needs immediate human attention),
  "flagReason": "reason for flagging (only if shouldFlag is true)"
}

IMPORTANT RULES:
- Be empathetic and professional in the response
- For academic queries, provide helpful educational guidance
- For complaints, acknowledge the issue and provide actionable steps
- For urgent/safety issues, ALWAYS flag them
- Keep the response concise but helpful`;

      const aiResult = await callGemini(
        aiPrompt,
        'You are an expert educational institution feedback analyst. Provide accurate sentiment analysis and helpful responses. Always return valid JSON.',
        true,
        null,
        true // Skip cache — each feedback is unique
      );

      // Update feedback with AI analysis
      const analysis = typeof aiResult === 'string' ? JSON.parse(aiResult) : aiResult;

      feedback.category = analysis.category || 'query';
      feedback.sentiment = analysis.sentiment || 'neutral';
      feedback.priority = analysis.priority || 'medium';
      feedback.aiSummary = analysis.summary || '';
      feedback.aiResponse = analysis.response || '';
      feedback.isFlagged = analysis.shouldFlag || false;
      feedback.flagReason = analysis.flagReason || '';

      // Determine final status
      if (analysis.shouldFlag) {
        feedback.status = 'flagged';
      } else {
        feedback.status = 'resolved';
      }

      // Send email response via Resend
      try {
        const { sendReportEmail } = require('../services/emailService');
        // We reuse the Resend infrastructure but send a different email
        await sendFeedbackEmail({
          to: student.email,
          studentName: `${student.firstName} ${student.lastName}`,
          query: query.trim(),
          response: feedback.aiResponse,
          category: feedback.category,
          sentiment: feedback.sentiment,
        });
        feedback.emailSent = true;
        feedback.emailSentAt = new Date();
      } catch (emailErr) {
        console.error('[FEEDBACK EMAIL ERROR]', emailErr.message);
        // Don't fail the whole request if email fails
        feedback.emailSent = false;
      }

      await feedback.save();

      res.status(201).json({
        message: 'Feedback submitted successfully',
        feedback: {
          _id: feedback._id,
          query: feedback.query,
          category: feedback.category,
          sentiment: feedback.sentiment,
          priority: feedback.priority,
          status: feedback.status,
          aiResponse: feedback.aiResponse,
          aiSummary: feedback.aiSummary,
          emailSent: feedback.emailSent,
          isFlagged: feedback.isFlagged,
          createdAt: feedback.createdAt,
        },
      });
    } catch (aiError) {
      console.error('[FEEDBACK AI ERROR]', aiError.message);
      // If AI fails, still save the feedback as pending
      feedback.status = 'pending';
      await feedback.save();

      res.status(201).json({
        message: 'Feedback submitted. AI analysis is pending.',
        feedback: {
          _id: feedback._id,
          query: feedback.query,
          status: 'pending',
          createdAt: feedback.createdAt,
        },
      });
    }
  } catch (error) {
    console.error('[SUBMIT FEEDBACK ERROR]', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
};

/**
 * Get all feedback for a student
 * GET /api/feedback/my
 */
exports.getMyFeedback = async (req, res) => {
  try {
    const student = await Student.findById(req.user.id);
    if (!student) {
      return res.status(403).json({ error: 'Student profile not found' });
    }

    const feedbacks = await Feedback.find({ student: student._id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      feedbacks: feedbacks.map(f => ({
        _id: f._id,
        query: f.query,
        category: f.category,
        sentiment: f.sentiment,
        priority: f.priority,
        status: f.status,
        aiResponse: f.aiResponse,
        aiSummary: f.aiSummary,
        emailSent: f.emailSent,
        isFlagged: f.isFlagged,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
      })),
    });
  } catch (error) {
    console.error('[GET MY FEEDBACK ERROR]', error);
    res.status(500).json({ error: 'Failed to get feedback' });
  }
};

/**
 * Get all feedback (Teacher/Admin view)
 * GET /api/feedback/all
 */
exports.getAllFeedback = async (req, res) => {
  try {
    const { status, flagged } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (flagged === 'true') filter.isFlagged = true;

    const feedbacks = await Feedback.find(filter)
      .populate('student', 'firstName lastName email studentId')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({
      feedbacks: feedbacks.map(f => ({
        _id: f._id,
        student: f.student ? {
          _id: f.student._id,
          name: `${f.student.firstName} ${f.student.lastName}`,
          email: f.student.email,
          studentId: f.student.studentId,
        } : null,
        query: f.query,
        category: f.category,
        sentiment: f.sentiment,
        priority: f.priority,
        status: f.status,
        aiResponse: f.aiResponse,
        aiSummary: f.aiSummary,
        emailSent: f.emailSent,
        isFlagged: f.isFlagged,
        flagReason: f.flagReason,
        createdAt: f.createdAt,
      })),
      stats: {
        total: await Feedback.countDocuments({}),
        pending: await Feedback.countDocuments({ status: 'pending' }),
        resolved: await Feedback.countDocuments({ status: 'resolved' }),
        flagged: await Feedback.countDocuments({ isFlagged: true }),
      },
    });
  } catch (error) {
    console.error('[GET ALL FEEDBACK ERROR]', error);
    res.status(500).json({ error: 'Failed to get feedback' });
  }
};

/**
 * Send feedback response email via Resend
 */
async function sendFeedbackEmail({ to, studentName, query, response, category, sentiment }) {
  const { Resend } = require('resend');
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey === 're_YOUR_RESEND_API_KEY_HERE') {
    console.warn('[FEEDBACK EMAIL] Resend API key not configured, skipping email');
    return;
  }

  const resend = new Resend(apiKey);

  const categoryColors = {
    academic: '#6366f1',
    complaint: '#ef4444',
    suggestion: '#f59e0b',
    query: '#3b82f6',
    feedback: '#10b981',
    technical: '#8b5cf6',
    other: '#64748b',
  };

  const sentimentEmoji = {
    positive: '😊',
    neutral: '💬',
    negative: '😟',
    urgent: '🚨',
  };

  const color = categoryColors[category] || '#6366f1';
  const emoji = sentimentEmoji[sentiment] || '💬';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc;">
  <div style="max-width: 580px; margin: 0 auto; padding: 40px 20px;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, ${color} 0%, ${color}dd 100%); border-radius: 16px 16px 0 0; padding: 32px; text-align: center;">
      <div style="display: inline-block; background: rgba(255,255,255,0.2); border-radius: 12px; padding: 10px 16px; margin-bottom: 12px;">
        <span style="font-size: 24px;">${emoji}</span>
      </div>
      <h1 style="margin: 0; color: #fff; font-size: 20px; font-weight: 700;">Response to Your Query</h1>
      <p style="margin: 6px 0 0; color: rgba(255,255,255,0.8); font-size: 13px;">AI-Powered Student Support</p>
    </div>

    <!-- Body -->
    <div style="background: #fff; border-radius: 0 0 16px 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); padding: 28px;">
      
      <p style="margin: 0 0 20px; font-size: 16px; font-weight: 600; color: #1e293b;">Hi ${studentName} 👋</p>

      <!-- Original Query -->
      <div style="background: #f1f5f9; border-left: 4px solid ${color}; border-radius: 0 8px 8px 0; padding: 16px; margin-bottom: 20px;">
        <p style="margin: 0 0 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; font-weight: 600;">Your Query</p>
        <p style="margin: 0; font-size: 14px; color: #475569; line-height: 1.5;">${query}</p>
      </div>

      <!-- AI Response -->
      <div style="background: linear-gradient(135deg, #eff6ff, #f5f3ff); border: 1px solid #c7d2fe; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
        <div style="margin-bottom: 10px;">
          <span style="font-size: 16px; margin-right: 6px;">🤖</span>
          <span style="font-size: 14px; font-weight: 700; color: #3730a3;">AI Response</span>
        </div>
        <p style="margin: 0; font-size: 14px; color: #475569; line-height: 1.7;">${response}</p>
      </div>

      <!-- Category badge -->
      <div style="text-align: center; margin-bottom: 20px;">
        <span style="display: inline-block; background: ${color}15; color: ${color}; border: 1px solid ${color}30; border-radius: 20px; padding: 4px 14px; font-size: 12px; font-weight: 600; text-transform: capitalize;">${category}</span>
      </div>

      <!-- Footer -->
      <div style="text-align: center; padding-top: 16px; border-top: 1px solid #f1f5f9;">
        <p style="margin: 0; font-size: 12px; color: #94a3b8;">This response was generated by AI. For further assistance, please contact your instructor.</p>
        <div style="margin-top: 12px; padding: 8px; background: #f8fafc; border-radius: 8px;">
          <p style="margin: 0; font-size: 11px; color: #94a3b8;">⚡ Powered by Student Portal AI</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'Student Portal <onboarding@resend.dev>',
    to: [to],
    subject: `${emoji} Response to your ${category} — Student Portal`,
    html,
  });

  if (error) {
    console.error('[FEEDBACK EMAIL SEND ERROR]', error);
    throw new Error(error.message || 'Failed to send email');
  }
}
