/**
 * Auth Controller
 * Handles authentication for students and teachers
 */

const { Student, Teacher } = require('../models');

// Register new student (teacher creates student account)
exports.registerStudent = async (req, res) => {
  try {
    const { email, password, firstName, lastName, studentId, major, graduationYear } = req.body;

    // Check if student exists
    const existingStudent = await Student.findOne({ email });
    if (existingStudent) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create student
    const student = await Student.create({
      email,
      password,
      firstName,
      lastName,
      studentId,
      major: major || 'Computer Science',
      graduationYear
    });

    const token = student.generateToken();
    res.status(201).json({ user: student.toJSON(), token });
  } catch (error) {
    console.error('[REGISTER STUDENT ERROR]', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// Login - detects if student or teacher
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Try student first
    let user = await Student.findOne({ email });
    let role = 'student';

    // If not student, try teacher
    if (!user) {
      user = await Teacher.findOne({ email });
      role = 'teacher';
    }

    // Check credentials
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
    const { role, id } = req.user;
    
    let user;
    if (role === 'student') {
      user = await Student.findById(id);
    } else if (role === 'teacher') {
      user = await Teacher.findById(id);
    }
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: user.toJSON() });
  } catch (error) {
    console.error('[GET PROFILE ERROR]', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
};

// Update profile
exports.updateProfile = async (req, res) => {
  try {
    const { role, id } = req.user;
    const { firstName, lastName, major } = req.body;

    let user;
    if (role === 'student') {
      user = await Student.findByIdAndUpdate(
        id,
        { firstName, lastName, major },
        { new: true }
      );
    } else if (role === 'teacher') {
      user = await Teacher.findByIdAndUpdate(
        id,
        { firstName, lastName },
        { new: true }
      );
    }

    res.json({ user: user.toJSON() });
  } catch (error) {
    console.error('[UPDATE PROFILE ERROR]', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// Logout
exports.logout = async (req, res) => {
  res.json({ message: 'Logged out successfully' });
};

// Teacher login (explicit)
exports.teacherLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const teacher = await Teacher.findOne({ email });
    if (!teacher || !(await teacher.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!teacher.isActive) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    teacher.lastLogin = new Date();
    await teacher.save();

    const token = teacher.generateToken();
    res.json({ user: teacher.toJSON(), token });
  } catch (error) {
    console.error('[TEACHER LOGIN ERROR]', error);
    res.status(500).json({ error: 'Login failed' });
  }
};
