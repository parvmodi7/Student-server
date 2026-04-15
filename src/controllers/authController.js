/**
 * Auth Controller
 * Handles authentication for both students and teachers
 */

// Register new user (student or teacher)
exports.register = async (req, res) => {
  try {
    const { email, password, role, firstName, lastName, studentId, employeeId, department } = req.body;

    // Check if user exists
    const { User } = require('../models');
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create user
    const user = await User.create({
      email,
      password,
      role,
      firstName,
      lastName
    });

    // Create role-specific profile
    if (role === 'student') {
      const { Student } = require('../models');
      await Student.create({
        userId: user._id,
        studentId,
        major: req.body.major || '',
        graduationYear: req.body.graduationYear
      });
    } else if (role === 'teacher') {
      const { Teacher } = require('../models');
      await Teacher.create({
        userId: user._id,
        employeeId,
        department
      });
    }

    const token = user.generateToken();
    res.status(201).json({ user: user.toJSON(), token });
  } catch (error) {
    console.error('[REGISTER ERROR]', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const { User } = require('../models');

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const token = user.generateToken();
    res.json({ user: user.toJSON(), token });
  } catch (error) {
    console.error('[LOGIN ERROR]', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// Get current user profile
exports.getProfile = async (req, res) => {
  try {
    const { User } = require('../models');
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get role-specific data
    let profileData = {};
    if (user.role === 'student') {
      const { Student } = require('../models');
      profileData = await Student.findOne({ userId: user._id })
        .populate('enrolledCourses');
    } else if (user.role === 'teacher') {
      const { Teacher } = require('../models');
      profileData = await Teacher.findOne({ userId: user._id })
        .populate('coursesTaught');
    }

    res.json({ user: user.toJSON(), profile: profileData });
  } catch (error) {
    console.error('[GET PROFILE ERROR]', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
};

// Update profile
exports.updateProfile = async (req, res) => {
  try {
    const { User } = require('../models');
    const { firstName, lastName, avatar } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { firstName, lastName, avatar },
      { new: true }
    );

    res.json({ user: user.toJSON() });
  } catch (error) {
    console.error('[UPDATE PROFILE ERROR]', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// Logout (client-side token removal, server just acknowledges)
exports.logout = async (req, res) => {
  res.json({ message: 'Logged out successfully' });
};