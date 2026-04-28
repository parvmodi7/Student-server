/**
 * PaperGeneration Model
 * Tracks AI-generated paper history per student per course
 * Used to improve accuracy over time and ensure unique papers
 */
const mongoose = require('mongoose');

const paperGenerationSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  generationNumber: {
    type: Number,
    default: 1
  },
  accuracyEstimate: {
    type: Number,
    default: 55
  },
  paperTitle: {
    type: String,
    default: ''
  },
  // Store topic hashes to avoid repeating the same focus areas
  topicsFocused: [{
    type: String
  }],
  pyqCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for quick lookups
paperGenerationSchema.index({ student: 1, course: 1, createdAt: -1 });

module.exports = mongoose.model('PaperGeneration', paperGenerationSchema);
