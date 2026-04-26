/**
 * Grade Model
 * Stores grades for students in courses, linked to assignments
 */
const mongoose = require('mongoose');

const gradeSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },
  grade: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  totalPoints: {
    type: Number,
    required: true,
    default: 100
  },
  percentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 0
  },
  letterGrade: {
    type: String,
    enum: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F', 'N/A'],
    default: 'N/A'
  },
  feedback: {
    type: String,
    default: ''
  },
  gradedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher'
  },
  gradedAt: {
    type: Date,
    default: Date.now
  },
  pdfUrl: {
    type: String
  },
  title: {
    type: String
  },
  assignment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment'
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
gradeSchema.index({ student: 1, course: 1 });
gradeSchema.index({ course: 1, student: 1 });
gradeSchema.index({ student: 1, course: 1 }, { unique: true });

module.exports = mongoose.model('Grade', gradeSchema);