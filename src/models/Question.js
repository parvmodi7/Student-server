/**
 * Question Model
 * Stores exam questions created by teachers for specific subjects/courses
 */
const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    default: null
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  question: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['theory', 'numerical', 'multiple-choice', 'coding'],
    default: 'theory'
  },
  options: [{
    text: String,
    isCorrect: Boolean
  }],
  idealAnswer: {
    type: String,
    default: ''
  },
  hint: {
    type: String,
    default: ''
  },
  marks: {
    type: Number,
    default: 10
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    default: 'Medium'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

questionSchema.index({ course: 1, subject: 1, isActive: 1 });

module.exports = mongoose.model('Question', questionSchema);
