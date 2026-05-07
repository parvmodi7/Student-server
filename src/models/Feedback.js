/**
 * Feedback Model
 * Stores student feedback, queries, and complaints
 * with AI-powered analysis and response tracking
 */
const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  query: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  // AI Analysis fields
  category: {
    type: String,
    enum: ['academic', 'complaint', 'suggestion', 'query', 'feedback', 'technical', 'other'],
    default: 'query'
  },
  sentiment: {
    type: String,
    enum: ['positive', 'neutral', 'negative', 'urgent'],
    default: 'neutral'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  aiSummary: {
    type: String,
    default: ''
  },
  aiResponse: {
    type: String,
    default: ''
  },
  // Status tracking
  status: {
    type: String,
    enum: ['pending', 'processing', 'resolved', 'flagged'],
    default: 'pending',
    index: true
  },
  // Whether AI response was emailed
  emailSent: {
    type: Boolean,
    default: false
  },
  emailSentAt: {
    type: Date
  },
  // Flag for admin/teacher attention
  isFlagged: {
    type: Boolean,
    default: false,
    index: true
  },
  flagReason: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
feedbackSchema.index({ student: 1, createdAt: -1 });
feedbackSchema.index({ status: 1, priority: -1 });
feedbackSchema.index({ isFlagged: 1, createdAt: -1 });

module.exports = mongoose.model('Feedback', feedbackSchema);
