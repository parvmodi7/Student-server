/**
 * Assignment Model
 * Represents assignments created by teachers for their courses
 */
const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  dueDate: {
    type: Date,
    required: true,
    index: true
  },
  totalPoints: {
    type: Number,
    required: true,
    min: 0
  },
  weight: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  type: {
    type: String,
    enum: ['homework', 'quiz', 'project', 'exam', 'essay', 'presentation'],
    default: 'homework'
  },
  submissions: [{
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    submittedAt: Date,
    content: String,
    attachments: [String],
    grade: Number,
    feedback: String,
    gradedAt: Date,
    gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' }
  }],
  isPublished: {
    type: Boolean,
    default: false,
    index: true
  },
  allowLateSubmission: {
    type: Boolean,
    default: true
  },
  latePenalty: {
    type: Number,
    default: 10,
    min: 0,
    max: 100
  },
  pdfUrl: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Indexes
assignmentSchema.index({ course: 1, dueDate: 1 });
assignmentSchema.index({ teacher: 1 });

module.exports = mongoose.model('Assignment', assignmentSchema);