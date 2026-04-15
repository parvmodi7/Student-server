/**
 * Teacher Controller
 * Handles teacher-specific dashboard and data operations
 * Uses Teacher model directly (no User model)
 */

const { Teacher, Course, Assignment, Grade, Student } = require('../models');

// Get teacher dashboard
exports.getDashboardData = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.user.id);
    if (!teacher) {
      return res.status(403).json({ error: 'Teacher profile not found' });
    }

    const courses = await Course.find({ teacher: teacher._id });

    let totalStudents = 0;
    let totalAssignments = 0;
    let upcomingDeadlines = [];

    for (const course of courses) {
      totalStudents += course.enrolledStudents?.length || 0;
      
      const assignments = await Assignment.find({
        course: course._id,
        dueDate: { $gte: new Date() }
      }).limit(3);
      
      totalAssignments += await Assignment.countDocuments({ course: course._id });
      
      assignments.forEach(a => {
        upcomingDeadlines.push({
          title: a.title,
          course: course.name,
          dueDate: a.dueDate
        });
      });
    }

    upcomingDeadlines.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    res.json({
      teacher: {
        id: teacher.employeeId,
        name: `${teacher.firstName} ${teacher.lastName}`,
        department: teacher.department,
        email: teacher.email
      },
      stats: {
        totalCourses: courses.length,
        totalStudents,
        totalAssignments,
        rating: teacher.rating,
        totalReviews: teacher.totalReviews
      },
      courses: courses.map(c => ({
        id: c._id,
        name: c.name,
        courseCode: c.courseCode,
        enrolled: c.enrolledStudents?.length || 0,
        maxStudents: c.maxStudents,
        semester: `${c.semester} ${c.year}`
      })),
      upcomingDeadlines: upcomingDeadlines.slice(0, 5)
    });
  } catch (error) {
    console.error('[GET TEACHER DASHBOARD DATA ERROR]', error);
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
};

// Get students in a course
exports.getCourseStudents = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.user.id);
    if (!teacher) {
      return res.status(403).json({ error: 'Teacher profile not found' });
    }

    const course = await Course.findById(req.params.courseId);
    if (!course || course.teacher.toString() !== teacher._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const students = await Student.find({
      _id: { $in: course.enrolledStudents }
    });

    res.json({ students: students.map(s => ({
      id: s._id,
      studentId: s.studentId,
      name: `${s.firstName} ${s.lastName}`,
      email: s.email,
      major: s.major,
      gpa: s.gpa
    }))});
  } catch (error) {
    console.error('[GET COURSE STUDENTS ERROR]', error);
    res.status(500).json({ error: 'Failed to get students' });
  }
};

// Get ALL students from database
exports.getAllStudents = async (req, res) => {
  try {
    const students = await Student.find({}).select('-password');
    
    res.json({ students: students.map(s => ({
      _id: s._id,
      email: s.email,
      firstName: s.firstName,
      lastName: s.lastName,
      isActive: s.isActive,
      createdAt: s.createdAt,
      studentId: s.studentId,
      major: s.major,
      gpa: s.gpa,
      totalCredits: s.totalCredits,
      graduationYear: s.graduationYear
    }))});
  } catch (error) {
    console.error('[GET ALL STUDENTS ERROR]', error);
    res.status(500).json({ error: 'Failed to get students' });
  }
};

// Get grades for a course
exports.getCourseGrades = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.user.id);
    if (!teacher) {
      return res.status(403).json({ error: 'Teacher profile not found' });
    }

    const course = await Course.findById(req.params.courseId);
    if (!course || course.teacher.toString() !== teacher._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const grades = await Grade.find({ course: course._id });

    const stats = {
      average: 0,
      highest: 0,
      lowest: 100,
      distribution: { 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0 }
    };

    if (grades.length > 0) {
      const percentages = grades.map(g => g.percentage);
      stats.average = (percentages.reduce((a, b) => a + b, 0) / grades.length).toFixed(1);
      stats.highest = Math.max(...percentages);
      stats.lowest = Math.min(...percentages);
    }

    res.json({ grades, stats });
  } catch (error) {
    console.error('[GET COURSE GRADES ERROR]', error);
    res.status(500).json({ error: 'Failed to get grades' });
  }
};

// Create a new course
exports.createCourse = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.user.id);
    if (!teacher) {
      return res.status(403).json({ error: 'Teacher profile not found' });
    }

    const course = await Course.create({
      ...req.body,
      teacher: teacher._id
    });

    teacher.coursesTaught.push(course._id);
    await teacher.save();

    res.status(201).json({ course });
  } catch (error) {
    console.error('[CREATE COURSE ERROR]', error);
    res.status(500).json({ error: 'Failed to create course' });
  }
};

// Create a new assignment
exports.createAssignment = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.user.id);
    if (!teacher) {
      return res.status(403).json({ error: 'Teacher profile not found' });
    }

    const course = await Course.findById(req.body.course);
    if (!course || course.teacher.toString() !== teacher._id.toString()) {
      return res.status(403).json({ error: 'Invalid course' });
    }

    const assignment = await Assignment.create({
      ...req.body,
      teacher: teacher._id
    });

    res.status(201).json({ assignment });
  } catch (error) {
    console.error('[CREATE ASSIGNMENT ERROR]', error);
    res.status(500).json({ error: 'Failed to create assignment' });
  }
};

// Update course
exports.updateCourse = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.user.id);
    if (!teacher) {
      return res.status(403).json({ error: 'Teacher profile not found' });
    }

    const course = await Course.findById(req.params.courseId);
    if (!course || course.teacher.toString() !== teacher._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    Object.assign(course, req.body);
    await course.save();

    res.json({ course });
  } catch (error) {
    console.error('[UPDATE COURSE ERROR]', error);
    res.status(500).json({ error: 'Failed to update course' });
  }
};

// Get all student users (for teacher)
exports.getAllStudentUsers = async (req, res) => {
  try {
    const students = await Student.find({}).select('-password');
    res.json({ students: students.map(s => s.toJSON()) });
  } catch (error) {
    console.error('[GET ALL STUDENT USERS ERROR]', error);
    res.status(500).json({ error: 'Failed to get students' });
  }
};

// Set student password
exports.setStudentPassword = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    student.password = password;
    await student.save();

    res.json({ message: 'Password updated successfully', studentId: student._id });
  } catch (error) {
    console.error('[SET STUDENT PASSWORD ERROR]', error);
    res.status(500).json({ error: 'Failed to set password' });
  }
};

// Create a new student (teacher creates student)
exports.createStudent = async (req, res) => {
  try {
    const { email, password, firstName, lastName, studentId, major, graduationYear } = req.body;

    const existingStudent = await Student.findOne({ email });
    if (existingStudent) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const student = await Student.create({
      email,
      password,
      firstName,
      lastName,
      studentId: studentId || `STU-${Date.now()}`,
      major: major || 'Computer Science',
      graduationYear
    });

    res.status(201).json({ 
      message: 'Student created successfully',
      student: student.toJSON()
    });
  } catch (error) {
    console.error('[CREATE STUDENT ERROR]', error);
    res.status(500).json({ error: 'Failed to create student' });
  }
};
