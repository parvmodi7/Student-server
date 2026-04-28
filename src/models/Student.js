/**
 * Student Model
 * Contains all student data including login credentials
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const studentSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    index: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  studentId: {
    type: String,
    required: true,
    unique: true
  },
  major: {
    type: String,
    default: ''
  },
  graduationYear: {
    type: Number
  },
  gpa: {
    type: Number,
    default: 0,
    min: 0,
    max: 4.0
  },
  pastGpa: [{
    gpa: { type: Number, min: 0, max: 4.0 },
    semester: String,
    date: { type: Date, default: Date.now }
  }],
  totalCredits: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  enrolledCourses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  attendance: [{
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    percentage: Number
  }],
  notifications: [{
    _id: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
    title: String,
    message: String,
    type: { type: String, enum: ['info', 'warning', 'urgent'] },
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

// Hash password before saving
studentSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
studentSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Generate JWT token
studentSchema.methods.generateToken = function() {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { id: this._id, role: 'student', email: this.email },
    process.env.JWT_SECRET || 'default-secret',
    { expiresIn: '7d' }
  );
};

// Transform output
studentSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  obj.role = 'student';
  return obj;
};

module.exports = mongoose.model('Student', studentSchema);
