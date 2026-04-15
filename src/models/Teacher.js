/**
 * Teacher Model
 * Extends User with teacher-specific fields like department, courses taught
 */
const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  employeeId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  department: {
    type: String,
    required: true
  },
  designation: {
    type: String,
    enum: ['professor', 'associate_professor', 'assistant_professor', 'lecturer', 'ta'],
    default: 'lecturer'
  },
  coursesTaught: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  officeHours: {
    start: String,
    end: String,
    days: [String],
    location: String
  },
  education: [{
    degree: String,
    institution: String,
    year: Number
  }],
  publications: [{
    title: String,
    year: Number,
    journal: String,
    url: String
  }],
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  studentsCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

teacherSchema.index({ department: 1 });
teacherSchema.index({ employeeId: 1 });

module.exports = mongoose.model('Teacher', teacherSchema);