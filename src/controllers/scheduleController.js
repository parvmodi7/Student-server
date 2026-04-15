/**
 * Schedule Controller
 * Handles schedule operations for students and teachers
 */

// Get student schedule
exports.getStudentSchedule = async (req, res) => {
  try {
    const { Schedule, Student, Course } = require('../models');
    const student = await Student.findOne({ userId: req.user.id });

    if (!student) {
      return res.status(403).json({ error: 'Student profile not found' });
    }

    const { day, semester, year } = req.query;
    const query = { students: student._id };
    if (day) query.day = day;
    if (semester) query.semester = semester;
    if (year) query.year = parseInt(year);

    const schedules = await Schedule.find(query)
      .populate('course', 'name courseCode')
      .sort({ startTime: 1 });

    res.json({ schedules });
  } catch (error) {
    console.error('[GET STUDENT SCHEDULE ERROR]', error);
    res.status(500).json({ error: 'Failed to get schedule' });
  }
};

// Get course schedule (Teacher)
exports.getCourseSchedule = async (req, res) => {
  try {
    const { Schedule, Teacher, Course } = require('../models');
    const teacher = await Teacher.findOne({ userId: req.user.id });

    if (!teacher) {
      return res.status(403).json({ error: 'Teacher profile not found' });
    }

    const course = await Course.findById(req.params.courseId);
    if (!course || course.teacher.toString() !== teacher._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const schedules = await Schedule.find({ course: course._id })
      .populate('course', 'name courseCode')
      .sort({ day: 1, startTime: 1 });

    res.json({ schedules });
  } catch (error) {
    console.error('[GET COURSE SCHEDULE ERROR]', error);
    res.status(500).json({ error: 'Failed to get schedule' });
  }
};

// Get today's schedule
exports.getTodaySchedule = async (req, res) => {
  try {
    const { Schedule, Student } = require('../models');
    const student = await Student.findOne({ userId: req.user.id });

    if (!student) {
      return res.status(403).json({ error: 'Student profile not found' });
    }

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()];

    const schedules = await Schedule.find({
      students: student._id,
      day: today
    })
      .populate('course', 'name courseCode')
      .sort({ startTime: 1 });

    res.json({ schedules, day: today });
  } catch (error) {
    console.error('[GET TODAY SCHEDULE ERROR]', error);
    res.status(500).json({ error: 'Failed to get schedule' });
  }
};

// Create schedule (Admin/Teacher)
exports.createSchedule = async (req, res) => {
  try {
    const { Schedule, Course, Teacher } = require('../models');
    
    const course = await Course.findById(req.body.course);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Verify teacher owns the course
    const teacher = await Teacher.findOne({ userId: req.user.id });
    if (teacher && course.teacher.toString() !== teacher._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const schedule = await Schedule.create(req.body);

    // Add students from course
    schedule.students = course.enrolledStudents;
    await schedule.save();

    res.status(201).json({ schedule });
  } catch (error) {
    console.error('[CREATE SCHEDULE ERROR]', error);
    res.status(500).json({ error: 'Failed to create schedule' });
  }
};