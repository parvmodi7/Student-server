/**
 * Schedule Model
 * Stores class schedules for students and courses
 */
const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  }],
  day: {
    type: String,
    required: true,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  location: {
    type: String
  },
  semester: {
    type: String,
    required: true
  },
  year: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
});

scheduleSchema.index({ course: 1, day: 1 });
scheduleSchema.index({ students: 1, day: 1 });

module.exports = mongoose.model('Schedule', scheduleSchema);