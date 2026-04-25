/**
 * Course Model
 * Represents a course that can be taught by teachers and enrolled by students
 */
const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  courseCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true,
    index: true
  },
  credits: {
    type: Number,
    required: true,
    min: 1,
    max: 6
  },
  semester: {
    type: String,
    required: true,
    enum: ['Fall', 'Spring', 'Summer', 'Winter']
  },
  year: {
    type: Number,
    required: true
  },
  maxStudents: {
    type: Number,
    default: 50
  },
  enrolledStudents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  }],
  schedule: [{
    day: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] },
    startTime: String,
    endTime: String,
    location: String
  }],
  syllabus: {
    topics: [String],
    textbooks: [String],
    gradingPolicy: {
      assignments: Number,
      exams: Number,
      projects: Number,
      participation: Number
    }
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'ongoing', 'completed'],
    default: 'draft'
  },
  attendance: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
courseSchema.index({ teacher: 1, semester: 1, year: 1 });
courseSchema.index({ 'enrolledStudents': 1 });

module.exports = mongoose.model('Course', courseSchema);