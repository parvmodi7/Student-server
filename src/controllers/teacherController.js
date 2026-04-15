/**
 * Teacher Controller
 * Handles teacher-specific dashboard and data operations
 */

const { User, Teacher, Course, Assignment, Grade, Student } = require('../models');

exports.getDashboardData = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ userId: req.user.id });
    if (!teacher) {
      return res.status(403).json({ error: 'Teacher profile not found' });
    }

    // Get courses taught
    const courses = await Course.find({ teacher: teacher._id })
      .populate('enrolledStudents');

    // Calculate stats
    let totalStudents = 0;
    let totalAssignments = 0;
    let upcomingDeadlines = [];

    for (const course of courses) {
      totalStudents += course.enrolledStudents.length;
      
      const assignments = await Assignment.find({
        course: course._id,
        dueDate: { $gte: new Date() }
      }).limit(3);
      
      totalAssignments += await Assignment.countDocuments({ course: course._id });
      
      assignments.forEach(a => {
        upcomingDeadlines.push({
          title: a.title,
          course: course.name,
          dueDate: a.dueDate,
          submissions: a.submissions.length
        });
      });
    }

    // Sort deadlines
    upcomingDeadlines.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    // Get recent submissions
    const recentSubmissions = [];
    const allAssignments = await Assignment.find({
      teacher: teacher._id
    }).populate('course', 'name');

    for (const assignment of allAssignments) {
      for (const submission of assignment.submissions.slice(-2)) {
        const student = await Student.findById(submission.student);
        if (student) {
          recentSubmissions.push({
            assignment: assignment.title,
            course: assignment.course?.name,
            student: student.studentId,
            studentName: `${student.userId?.firstName || 'Student'}`,
            submittedAt: submission.submittedAt,
            graded: !!submission.grade
          });
        }
      }
    }

    res.json({
      teacher: {
        id: teacher.employeeId,
        name: `${req.user.firstName} ${req.user.lastName}`,
        department: teacher.designation,
        email: req.user.email
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
        enrolled: c.enrolledStudents.length,
        maxStudents: c.maxStudents,
        semester: `${c.semester} ${c.year}`
      })),
      upcomingDeadlines: upcomingDeadlines.slice(0, 5),
      recentSubmissions: recentSubmissions.slice(0, 10)
    });
  } catch (error) {
    console.error('[GET TEACHER DASHBOARD DATA ERROR]', error);
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
};

exports.getCourseStudents = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ userId: req.user.id });
    if (!teacher) {
      return res.status(403).json({ error: 'Teacher profile not found' });
    }

    const course = await Course.findById(req.params.courseId)
      .populate('enrolledStudents');

    if (!course || course.teacher.toString() !== teacher._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const students = await Promise.all(course.enrolledStudents.map(async (student) => {
      const grades = await Grade.find({ 
        student: student._id, 
        course: course._id 
      });
      
      const average = grades.length > 0
        ? (grades.reduce((sum, g) => sum + g.percentage, 0) / grades.length).toFixed(1)
        : 'N/A';

      return {
        id: student._id,
        studentId: student.studentId,
        name: student.userId ? `${student.userId.firstName} ${student.userId.lastName}` : 'Unknown',
        email: student.userId?.email || '',
        major: student.major,
        attendance: student.attendance.find(a => a.courseId.toString() === course._id.toString())?.percentage || 0,
        averageGrade: average,
        grades: grades.map(g => ({
          assignment: g.assignment?.title || 'Overall',
          grade: g.grade,
          totalPoints: g.totalPoints,
          letterGrade: g.letterGrade
        }))
      };
    }));

    res.json({ students });
  } catch (error) {
    console.error('[GET COURSE STUDENTS ERROR]', error);
    res.status(500).json({ error: 'Failed to get students' });
  }
};

exports.getAllStudents = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ userId: req.user.id });
    if (!teacher) {
      return res.status(403).json({ error: 'Teacher profile not found' });
    }

    const courses = await Course.find({ teacher: teacher._id });
    const courseIds = courses.map(c => c._id);

    const students = await Student.find({
      enrolledCourses: { $in: courseIds }
    }).populate('userId', 'firstName lastName email');

    // Group by course
    const studentsByCourse = {};
    courses.forEach(c => {
      studentsByCourse[c._id] = [];
    });

    for (const student of students) {
      for (const courseId of student.enrolledCourses) {
        if (studentsByCourse[courseId]) {
          const existing = studentsByCourse[courseId].find(s => s._id.toString() === student._id.toString());
          if (!existing) {
            studentsByCourse[courseId].push(student);
          }
        }
      }
    }

    const result = courses.map(c => ({
      courseId: c._id,
      courseName: c.name,
      courseCode: c.courseCode,
      students: studentsByCourse[c._id].map(s => ({
        id: s._id,
        studentId: s.studentId,
        name: s.userId ? `${s.userId.firstName} ${s.userId.lastName}` : 'Unknown',
        email: s.userId?.email || '',
        major: s.major
      }))
    }));

    res.json({ courses: result });
  } catch (error) {
    console.error('[GET ALL STUDENTS ERROR]', error);
    res.status(500).json({ error: 'Failed to get students' });
  }
};

exports.getCourseGrades = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ userId: req.user.id });
    if (!teacher) {
      return res.status(403).json({ error: 'Teacher profile not found' });
    }

    const course = await Course.findById(req.params.courseId);
    if (!course || course.teacher.toString() !== teacher._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const grades = await Grade.find({ course: course._id })
      .populate('student', 'studentId')
      .populate('assignment', 'title totalPoints');

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
      
      grades.forEach(g => {
        const letter = g.letterGrade.charAt(0);
        if (stats.distribution[letter] !== undefined) {
          stats.distribution[letter]++;
        }
      });
    }

    res.json({ grades, stats });
  } catch (error) {
    console.error('[GET COURSE GRADES ERROR]', error);
    res.status(500).json({ error: 'Failed to get grades' });
  }
};

exports.createCourse = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ userId: req.user.id });
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

exports.createAssignment = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ userId: req.user.id });
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

exports.updateCourse = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ userId: req.user.id });
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