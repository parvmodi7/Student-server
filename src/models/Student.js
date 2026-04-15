/**
 * Student Model
 * Extends User with student-specific fields like studentId, enrolled courses, grades
 */
const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  studentId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  enrolledCourses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  enrolledAt: {
    type: Date,
    default: Date.now
  },
  graduationYear: {
    type: Number
  },
  major: {
    type: String
  },
  gpa: {
    type: Number,
    default: 0,
    min: 0,
    max: 4.0
  },
  totalCredits: {
    type: Number,
    default: 0
  },
  completedAssignments: [{
    assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment' },
    submittedAt: Date,
    grade: Number,
    feedback: String
  }],
  attendance: [{
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    present: Number,
    total: Number,
    percentage: Number
  }],
  schedule: [{
    day: String,
    time: String,
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    location: String
  }],
  notifications: [{
    title: String,
    message: String,
    type: { type: String, enum: ['info', 'warning', 'urgent'] },
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

// Index for efficient queries
studentSchema.index({ studentId: 1 });
studentSchema.index({ 'enrolledCourses': 1 });

module.exports = mongoose.model('Student', studentSchema);