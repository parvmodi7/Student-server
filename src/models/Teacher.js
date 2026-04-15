/**
 * Teacher Model
 * Contains all teacher data including login credentials
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const teacherSchema = new mongoose.Schema({
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
  employeeId: {
    type: String,
    required: true,
    unique: true
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
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
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
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Hash password before saving
teacherSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
teacherSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Generate JWT token
teacherSchema.methods.generateToken = function() {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { id: this._id, role: 'teacher', email: this.email },
    process.env.JWT_SECRET || 'default-secret',
    { expiresIn: '7d' }
  );
};

// Transform output
teacherSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  obj.role = 'teacher';
  return obj;
};

module.exports = mongoose.model('Teacher', teacherSchema);
