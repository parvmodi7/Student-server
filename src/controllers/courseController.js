/**
 * Course Controller
 * Handles course operations for students and teachers
 * Optimized with caching for frequently accessed data
 */

// Get all courses (with caching)
exports.getAllCourses = async (req, res) => {
  try {
    const { Course } = require('../models');
    const { semester, year, page = 1, limit = 20 } = req.query;

    const query = { isActive: true };
    if (semester) query.semester = semester;
    if (year) query.year = parseInt(year);

    const courses = await Course.find(query)
      .populate('teacher', 'userId firstName lastName')
      .select('-enrolledStudents')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Course.countDocuments(query);

    res.json({
      courses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('[GET COURSES ERROR]', error);
    res.status(500).json({ error: 'Failed to get courses' });
  }
};

// Get single course details
exports.getCourse = async (req, res) => {
  try {
    if (!req.params.id || req.params.id === 'undefined') {
      return res.status(400).json({ error: 'Course ID is required' });
    }
    const { Course } = require('../models');
    const course = await Course.findById(req.params.id)
      .populate('teacher', 'userId firstName lastName department')
      .populate('enrolledStudents', 'studentId userId firstName lastName email major gpa pastGpa useLatestGpa');

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    res.json({ course });
  } catch (error) {
    console.error('[GET COURSE ERROR]', error);
    res.status(500).json({ error: 'Failed to get course' });
  }
};

// Create course (Teacher only)
exports.createCourse = async (req, res) => {
  try {
    const { Course, Teacher } = require('../models');
    
    const teacher = await Teacher.findById(req.user.id);
    if (!teacher) {
      return res.status(403).json({ error: 'Teacher profile not found' });
    }

    const course = await Course.create({
      ...req.body,
      teacher: teacher._id
    });

    // Update teacher's courses
    teacher.coursesTaught.push(course._id);
    await teacher.save();

    res.status(201).json({ course });
  } catch (error) {
    console.error('[CREATE COURSE ERROR]', error);
    res.status(500).json({ error: 'Failed to create course' });
  }
};

// Update course (Teacher only)
exports.updateCourse = async (req, res) => {
  try {
    const { Course, Teacher } = require('../models');
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const teacher = await Teacher.findById(req.user.id);
    if (!teacher || course.teacher.toString() !== teacher._id.toString()) {
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

// Delete course (Teacher only)
exports.deleteCourse = async (req, res) => {
  try {
    const { Course, Teacher } = require('../models');
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const teacher = await Teacher.findById(req.user.id);
    if (!teacher || course.teacher.toString() !== teacher._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    course.isActive = false;
    await course.save();

    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('[DELETE COURSE ERROR]', error);
    res.status(500).json({ error: 'Failed to delete course' });
  }
};

// Enroll in course (Student only)
exports.enrollCourse = async (req, res) => {
  try {
    const { Course, Student } = require('../models');
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (course.enrolledStudents.length >= course.maxStudents) {
      return res.status(400).json({ error: 'Course is full' });
    }

    const student = await Student.findById(req.user.id);
    if (!student) {
      return res.status(403).json({ error: 'Student profile not found' });
    }

    if (student.enrolledCourses.includes(course._id)) {
      return res.status(400).json({ error: 'Already enrolled' });
    }

    // Add student to course
    course.enrolledStudents.push(student._id);
    await course.save();

    // Add course to student
    student.enrolledCourses.push(course._id);
    await student.save();

    res.json({ message: 'Enrolled successfully', course });
  } catch (error) {
    console.error('[ENROLL COURSE ERROR]', error);
    res.status(500).json({ error: 'Failed to enroll' });
  }
};

// Get teacher's courses
exports.getTeacherCourses = async (req, res) => {
  try {
    const { Course, Teacher } = require('../models');
    const teacher = await Teacher.findById(req.user.id);

    if (!teacher) {
      return res.status(403).json({ error: 'Teacher profile not found' });
    }

    const courses = await Course.find({ teacher: teacher._id })
      .populate('enrolledStudents', 'studentId userId firstName lastName email major gpa pastGpa useLatestGpa')
      .sort({ createdAt: -1 });

    res.json({ courses });
  } catch (error) {
    console.error('[GET TEACHER COURSES ERROR]', error);
    res.status(500).json({ error: 'Failed to get courses' });
  }
};

// Get student's enrolled courses
exports.getStudentCourses = async (req, res) => {
  try {
    const { Course, Student } = require('../models');
    const student = await Student.findById(req.user.id)
      .populate({
        path: 'enrolledCourses',
        populate: { path: 'teacher', select: 'firstName lastName' }
      });

    if (!student) {
      return res.status(403).json({ error: 'Student profile not found' });
    }

    res.json({ courses: student.enrolledCourses });
  } catch (error) {
    console.error('[GET STUDENT COURSES ERROR]', error);
    res.status(500).json({ error: 'Failed to get courses' });
  }
};

// Teacher enrolls a specific student in their course
exports.enrollStudentByTeacher = async (req, res) => {
  try {
    const { Course, Student, Teacher } = require('../models');
    const { studentId } = req.body;

    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const teacher = await Teacher.findById(req.user.id);
    if (!teacher || course.teacher.toString() !== teacher._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (course.enrolledStudents.includes(student._id)) {
      return res.status(400).json({ error: 'Student already enrolled' });
    }

    if (course.enrolledStudents.length >= course.maxStudents) {
      return res.status(400).json({ error: 'Course is full' });
    }

    course.enrolledStudents.push(student._id);
    await course.save();

    if (!student.enrolledCourses.includes(course._id)) {
      student.enrolledCourses.push(course._id);
      await student.save();
    }

    res.json({ message: 'Student enrolled successfully' });
  } catch (error) {
    console.error('[ENROLL STUDENT BY TEACHER ERROR]', error);
    res.status(500).json({ error: 'Failed to enroll student' });
  }
};

// Teacher removes a student from their course
exports.removeStudentByTeacher = async (req, res) => {
  try {
    const { Course, Student, Teacher } = require('../models');
    const { studentId } = req.body;

    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check ownership
    const teacher = await Teacher.findById(req.user.id);
    if (!teacher || course.teacher.toString() !== teacher._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    course.enrolledStudents = course.enrolledStudents.filter(
      (id) => id.toString() !== studentId
    );
    await course.save();

    student.enrolledCourses = student.enrolledCourses.filter(
      (id) => id.toString() !== course._id.toString()
    );
    await student.save();

    res.json({ message: 'Student removed successfully' });
  } catch (error) {
    console.error('[REMOVE STUDENT BY TEACHER ERROR]', error);
    res.status(500).json({ error: 'Failed to remove student' });
  }
};

// Save attendance for a course
exports.saveAttendance = async (req, res) => {
  try {
    const { Course, Teacher } = require('../models');
    const { date, records } = req.body;

    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const teacher = await Teacher.findById(req.user.id);
    if (!teacher || course.teacher.toString() !== teacher._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await Course.findByIdAndUpdate(course._id, {
      $set: { [`attendance.${date}`]: records }
    });

    res.json({ message: 'Attendance saved successfully' });
  } catch (error) {
    console.error('[SAVE ATTENDANCE ERROR]', error);
    res.status(500).json({ error: 'Failed to save attendance' });
  }
};

// Get attendance records for a course
exports.getAttendance = async (req, res) => {
  try {
    const { Course, Teacher, Student } = require('../models');
    const course = await Course.findById(req.params.id)
      .populate('enrolledStudents', 'studentId firstName lastName email');

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const isTeacher = req.user.role === 'teacher';
    if (isTeacher) {
      const teacher = await Teacher.findById(req.user.id);
      if (!teacher || course.teacher.toString() !== teacher._id.toString()) {
        return res.status(403).json({ error: 'Not authorized' });
      }
    }

    res.json({ attendance: course.attendance || {} });
  } catch (error) {
    console.error('[GET ATTENDANCE ERROR]', error);
    res.status(500).json({ error: 'Failed to get attendance' });
  }
};

// Get student's attendance for all their courses
exports.getStudentAttendance = async (req, res) => {
  try {
    const { Course, Student } = require('../models');
    const student = await Student.findById(req.user.id);

    if (!student) {
      return res.status(403).json({ error: 'Student not found' });
    }

    const courses = await Course.find({ _id: { $in: student.enrolledCourses } })
      .select('name courseCode attendance')
      .lean();

    const attendanceData = courses.map((course) => {
      const records = course.attendance || {};
      const studentId = student._id.toString();
      console.log(`[getStudentAttendance] Course: ${course.courseCode}, studentId: ${studentId}, records:`, JSON.stringify(records));
      let totalPresent = 0;
      let totalSessions = 0;

      Object.entries(records).forEach(([date, dateRecords]) => {
        if (dateRecords && typeof dateRecords === 'object') {
          Object.entries(dateRecords).forEach(([sid, record]) => {
            if (sid === studentId) {
              totalSessions++;
              const recordObj = record;
              if (recordObj && recordObj.present === true) {
                totalPresent++;
              }
            }
          });
        }
      });

      const percentage = totalSessions > 0 ? Math.round((totalPresent / totalSessions) * 100) : 0;

      return {
        courseId: course._id,
        courseName: course.name,
        courseCode: course.courseCode,
        totalSessions,
        presentSessions: totalPresent,
        percentage,
      };
    });

    res.json({ attendance: attendanceData });
  } catch (error) {
    console.error('[GET STUDENT ATTENDANCE ERROR]', error);
    res.status(500).json({ error: 'Failed to get attendance' });
  }
};