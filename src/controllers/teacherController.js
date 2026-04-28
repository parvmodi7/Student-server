/**
 * Teacher Controller
 * Handles teacher-specific dashboard and data operations
 * Uses Teacher model directly (no User model)
 */

const mongoose = require('mongoose');
const { Teacher, Course, Assignment, Grade, Student } = require('../models');
const { appendToSheet } = require('../utils/googleSheets');
const websocketService = require('../services/websocket');

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
      teacher: teacher._id,
      isPublished: true
    });

    const students = await Student.find({ _id: { $in: course.enrolledStudents } });
    for (const student of students) {
      if (!student.notifications) {
        student.notifications = [];
      }
      const notifId = new mongoose.Types.ObjectId();
      const notif = {
        _id: notifId,
        title: 'New Assignment',
        message: `New assignment "${assignment.title}" has been posted in ${course.name}. Due: ${new Date(assignment.dueDate).toLocaleDateString()}`,
        type: 'info',
        isRead: false,
        createdAt: new Date()
      };
      student.notifications.unshift(notif);
      await student.save();
      
      websocketService.notifyStudent(student._id.toString(), {
        type: 'new_notification',
        notification: notif
      });
    }

    res.status(201).json({ assignment, studentsNotified: students.length });
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

// Update student
exports.updateStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { firstName, lastName, email, major, gpa, semester, pastGpa } = req.body;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (firstName) student.firstName = firstName;
    if (lastName) student.lastName = lastName;
    if (email) student.email = email;
    if (major !== undefined) student.major = major;
    if (gpa !== undefined && gpa !== student.gpa) {
      if (student.gpa > 0) {
        student.pastGpa.push({ gpa: student.gpa, semester: `Semester ${student.semester || 'N/A'}` });
      }
      student.gpa = gpa;
    }
    if (semester !== undefined) student.semester = semester;
    if (pastGpa) student.pastGpa = pastGpa;

    await student.save();

    res.json({ message: 'Student updated successfully', student: student.toJSON() });
  } catch (error) {
    console.error('[UPDATE STUDENT ERROR]', error);
    res.status(500).json({ error: 'Failed to update student' });
  }
};

// Delete student
exports.deleteStudent = async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    await Course.updateMany(
      { enrolledStudents: studentId },
      { $pull: { enrolledStudents: studentId } }
    );

    await Grade.deleteMany({ student: studentId });
    await student.deleteOne();

    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('[DELETE STUDENT ERROR]', error);
    res.status(500).json({ error: 'Failed to delete student' });
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
    const { email, password, firstName, lastName, studentId, major, graduationYear, enrolledCourses } = req.body;

    const existingStudent = await Student.findOne({ email });
    if (existingStudent) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const newStudentId = studentId || `STU-${Date.now()}`;
    const newMajor = major || 'Computer Science';

    const student = await Student.create({
      email,
      password,
      firstName,
      lastName,
      studentId: newStudentId,
      major: newMajor,
      graduationYear,
      enrolledCourses: enrolledCourses || []
    });

    if (enrolledCourses && enrolledCourses.length > 0) {
      await Course.updateMany(
        { _id: { $in: enrolledCourses } },
        { $addToSet: { enrolledStudents: student._id } }
      );
    }

    // Append to Google Sheet
    await appendToSheet([
      `${firstName} ${lastName}`,
      email,
      newStudentId,
      newMajor,
      '0', // Initial GPA
      '1', // Initial Semester
      new Date().toLocaleDateString("en-GB")
    ]);

    res.status(201).json({ 
      message: 'Student created successfully',
      student: student.toJSON()
    });
  } catch (error) {
    console.error('[CREATE STUDENT ERROR]', error);
    res.status(500).json({ error: 'Failed to create student' });
  }
};

// Publish result with PDF for a course
exports.publishResult = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.user.id);
    if (!teacher) {
      return res.status(403).json({ error: 'Teacher profile not found' });
    }

    const { courseId, title, pdfUrl } = req.body;

    if (!courseId) {
      return res.status(400).json({ error: 'Course ID is required' });
    }

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Get the specific course
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (course.teacher.toString() !== teacher._id.toString()) {
      return res.status(403).json({ error: 'You do not teach this course' });
    }

    const students = await Student.find({ _id: { $in: course.enrolledStudents } });
    const totalStudents = students.length;
    
    const results = [];
    const uniqueStudentIds = new Set();

    for (const student of students) {
      if (uniqueStudentIds.has(student._id.toString())) {
        continue;
      }
      uniqueStudentIds.add(student._id.toString());

      let grade = await Grade.findOne({ student: student._id, course: course._id });
      
      if (grade) {
        grade.pdfUrl = pdfUrl;
        grade.title = title;
        grade.gradedAt = new Date();
        await grade.save();
        results.push(grade);
      } else {
        grade = await Grade.create({
          student: student._id,
          course: course._id,
          grade: 0,
          totalPoints: 100,
          percentage: 0,
          letterGrade: 'N/A',
          feedback: '',
          gradedBy: teacher._id,
          gradedAt: new Date(),
          pdfUrl: pdfUrl,
          title: title
        });
        results.push(grade);
      }

      if (!student.notifications) {
        student.notifications = [];
      }
      student.notifications.unshift({
        _id: new mongoose.Types.ObjectId(),
        title: 'New Result Published',
        message: `"${title}" has been published for ${course.name}. Check your Dojo.`,
        type: 'info',
        isRead: false,
        createdAt: new Date()
      });
      await student.save();
    }

    res.status(201).json({ 
      message: 'Results published successfully',
      results,
      studentsNotified: uniqueStudentIds.size
    });
  } catch (error) {
    console.error('[PUBLISH RESULT ERROR]', error);
    res.status(500).json({ error: 'Failed to publish results' });
  }
};

// Send notification to all students
exports.sendNotification = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.user.id);
    if (!teacher) {
      return res.status(403).json({ error: 'Teacher profile not found' });
    }

    const { title, message } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    const courses = await Course.find({ teacher: teacher._id });
    const uniqueStudentIds = new Set();
    
    courses.forEach(course => {
      course.enrolledStudents?.forEach(studentId => {
        uniqueStudentIds.add(studentId.toString());
      });
    });

    const students = await Student.find({ _id: { $in: Array.from(uniqueStudentIds) } });
    const totalStudents = students.length;

    for (const student of students) {
      if (!student.notifications) {
        student.notifications = [];
      }
      const notif = {
        _id: new mongoose.Types.ObjectId(),
        title: title,
        message: message,
        type: 'info',
        isRead: false,
        createdAt: new Date()
      };
      student.notifications.unshift(notif);
      await student.save();
      
      websocketService.notifyStudent(student._id.toString(), {
        type: 'new_notification',
        notification: notif
      });
    }

    res.status(201).json({ 
      message: 'Notification sent successfully',
      studentsNotified: totalStudents
    });
  } catch (error) {
    console.error('[SEND NOTIFICATION ERROR]', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
};

// Upload PYQ paper for a course
exports.createPyq = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.user.id);
    if (!teacher) {
      return res.status(403).json({ error: 'Teacher profile not found' });
    }

    const { course: courseId, year, pdfUrl } = req.body;

    if (!courseId || !year || !pdfUrl) {
      return res.status(400).json({ error: 'Course, year, and PDF URL are required' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (course.teacher.toString() !== teacher._id.toString()) {
      return res.status(403).json({ error: 'You do not teach this course' });
    }

    const { Pyq } = require('../models');

    // Upsert: update if exists, create if not
    const pyq = await Pyq.findOneAndUpdate(
      { course: courseId, year },
      { pdfUrl, uploadedBy: teacher._id },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({ message: 'PYQ uploaded successfully', pyq });
  } catch (error) {
    console.error('[CREATE PYQ ERROR]', error);
    res.status(500).json({ error: 'Failed to upload PYQ' });
  }
};

// Get PYQs for a course
exports.getPyqsByCourse = async (req, res) => {
  try {
    const { Pyq } = require('../models');
    const pyqs = await Pyq.find({ course: req.params.courseId })
      .sort({ year: -1 });

    res.json({ pyqs });
  } catch (error) {
    console.error('[GET PYQS ERROR]', error);
    res.status(500).json({ error: 'Failed to get PYQs' });
  }
};

const getLetterGrade = (percentage) => {
  if (percentage >= 90) return 'A+';
  if (percentage >= 85) return 'A';
  if (percentage >= 80) return 'A-';
  if (percentage >= 75) return 'B+';
  if (percentage >= 70) return 'B';
  if (percentage >= 65) return 'B-';
  if (percentage >= 60) return 'C+';
  if (percentage >= 55) return 'C';
  if (percentage >= 50) return 'C-';
  if (percentage >= 45) return 'D+';
  if (percentage >= 40) return 'D';
  if (percentage >= 35) return 'D-';
  return 'F';
};
