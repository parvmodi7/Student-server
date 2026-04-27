/**
 * PYQ (Previous Year Question Paper) Model
 * Stores uploaded previous year papers per course per year
 */
const mongoose = require('mongoose');

const pyqSchema = new mongoose.Schema({
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  pdfUrl: {
    type: String,
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure one paper per course per year
pyqSchema.index({ course: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('Pyq', pyqSchema);
