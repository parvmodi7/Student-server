/**
 * Student Controller
 * Handles student-specific dashboard and data operations
 */

const User = require('../models/User');
const Student = require('../models/Student');
const Course = require('../models/Course');
const Assignment = require('../models/Assignment');
const Grade = require('../models/Grade');
const Schedule = require('../models/Schedule');

function getGPAPoints(letterGrade) {
  const gradePoints = {
    'A+': 4.0, 'A': 4.0, 'A-': 3.7,
    'B+': 3.3, 'B': 3.0, 'B-': 2.7,
    'C+': 2.3, 'C': 2.0, 'C-': 1.7,
    'D+': 1.3, 'D': 1.0, 'D-': 0.7,
    'F': 0.0
  };
  return gradePoints[letterGrade] || 0;
}

exports.getDashboardData = async function(req, res) {
  try {
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      return res.status(403).json({ error: 'Student profile not found' });
    }

    const courses = await Course.find({ _id: { $in: student.enrolledCourses } })
      .populate('teacher', 'firstName lastName');

    const grades = await Grade.find({ student: student._id })
      .populate('course', 'name courseCode credits')
      .populate('assignment', 'title totalPoints');

    let totalPoints = 0;
    let totalCredits = 0;
    grades.forEach(function(g) {
      const gpa = getGPAPoints(g.letterGrade);
      const credits = g.course ? g.course.credits : 3;
      totalPoints += gpa * credits;
      totalCredits += credits;
    });
    const gpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0';

    const upcomingAssignments = await Assignment.find({
      course: { $in: student.enrolledCourses },
      dueDate: { $gte: new Date() },
      isPublished: true
    })
      .populate('course', 'name')
      .sort({ dueDate: 1 })
      .limit(5);

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var today = days[new Date().getDay()];
    
    const todaySchedule = await Schedule.find({
      students: student._id,
      day: today
    })
      .populate('course', 'name courseCode')
      .sort({ startTime: 1 });

    var totalPresent = 0;
    var totalClasses = 0;
    student.attendance.forEach(function(a) {
      totalPresent += a.present;
      totalClasses += a.total;
    });
    var attendance = totalClasses > 0 ? Math.round((totalPresent / totalClasses) * 100) : 0;

    res.json({
      student: {
        id: student.studentId,
        name: req.user.firstName + ' ' + req.user.lastName,
        major: student.major,
        semester: student.enrolledCourses.length,
        graduationYear: student.graduationYear
      },
      gpa: parseFloat(gpa),
      totalCredits: totalCredits,
      attendance: attendance,
      courses: courses.map(function(c) {
        return {
          id: c._id,
          name: c.name,
          courseCode: c.courseCode,
          teacher: c.teacher ? c.teacher.firstName + ' ' + c.teacher.lastName : 'TBA',
          credits: c.credits,
          schedule: c.schedule
        };
      }),
      upcomingAssignments: upcomingAssignments.map(function(a) {
        return {
          id: a._id,
          title: a.title,
          course: a.course ? a.course.name : 'Unknown',
          dueDate: a.dueDate,
          totalPoints: a.totalPoints
        };
      }),
      todaySchedule: todaySchedule.map(function(s) {
        return {
          course: s.course ? s.course.name : 'Unknown',
          courseCode: s.course ? s.course.courseCode : '',
          time: s.startTime + ' - ' + s.endTime,
          location: s.location
        };
      }),
      notifications: student.notifications ? student.notifications.filter(function(n) { return !n.isRead; }).slice(0, 5) : [],
      grades: grades.map(function(g) {
        return {
          course: g.course ? g.course.name : 'Unknown',
          courseCode: g.course ? g.course.courseCode : '',
          grade: g.letterGrade,
          percentage: g.percentage.toFixed(1)
        };
      })
    });
  } catch (error) {
    console.error('[GET DASHBOARD DATA ERROR]', error);
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
};

exports.getCoursesWithGrades = async function(req, res) {
  try {
    var student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      return res.status(403).json({ error: 'Student profile not found' });
    }

    var courses = await Course.find({ _id: { $in: student.enrolledCourses } })
      .populate('teacher', 'firstName lastName email');

    var coursesWithGrades = await Promise.all(courses.map(async function(course) {
      var courseGrades = await Grade.find({ student: student._id, course: course._id });
      var average = courseGrades.length > 0 
        ? (courseGrades.reduce(function(sum, g) { return sum + g.percentage; }, 0) / courseGrades.length).toFixed(1)
        : 'N/A';
      
      return {
        id: course._id,
        name: course.name,
        courseCode: course.courseCode,
        teacher: course.teacher ? course.teacher.firstName + ' ' + course.teacher.lastName : 'TBA',
        credits: course.credits,
        grade: average,
        schedule: course.schedule
      };
    }));

    res.json({ courses: coursesWithGrades });
  } catch (error) {
    console.error('[GET COURSES WITH GRADES ERROR]', error);
    res.status(500).json({ error: 'Failed to get courses' });
  }
};

exports.getAssignmentsWithStatus = async function(req, res) {
  try {
    var student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      return res.status(403).json({ error: 'Student profile not found' });
    }

    var status = req.query.status;
    var query = { course: { $in: student.enrolledCourses }, isPublished: true };
    
    if (status === 'pending') {
      query.dueDate = { $gte: new Date() };
    } else if (status === 'submitted') {
      query.dueDate = { $lt: new Date() };
    }

    var assignments = await Assignment.find(query)
      .populate('course', 'name courseCode')
      .sort({ dueDate: 1 });

    var assignmentsWithStatus = assignments.map(function(a) {
      var submission = a.submissions.find(function(s) {
        return s.student.toString() === student._id.toString();
      });
      return {
        id: a._id,
        title: a.title,
        description: a.description,
        course: a.course ? a.course.name : 'Unknown',
        courseCode: a.course ? a.course.courseCode : '',
        dueDate: a.dueDate,
        totalPoints: a.totalPoints,
        type: a.type,
        status: submission ? 'submitted' : (new Date() > a.dueDate ? 'overdue' : 'pending'),
        submittedAt: submission ? submission.submittedAt : null,
        grade: submission ? submission.grade : null
      };
    });

    res.json({ assignments: assignmentsWithStatus });
  } catch (error) {
    console.error('[GET ASSIGNMENTS WITH STATUS ERROR]', error);
    res.status(500).json({ error: 'Failed to get assignments' });
  }
};

exports.getResults = async function(req, res) {
  try {
    var student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      return res.status(403).json({ error: 'Student profile not found' });
    }

    var grades = await Grade.find({ student: student._id })
      .populate({ path: 'course', select: 'name courseCode' })
      .populate({ path: 'assignment', select: 'title type' })
      .sort({ gradedAt: -1 });

    var results = grades.map(function(g) {
      return {
        id: g._id,
        course: g.course ? g.course.name : 'Unknown',
        courseCode: g.course ? g.course.courseCode : '',
        title: g.assignment ? g.assignment.title : 'Course Grade',
        type: g.assignment ? g.assignment.type : 'overall',
        examDate: g.gradedAt,
        marksObtained: g.grade,
        totalMarks: g.totalPoints,
        grade: g.letterGrade,
        feedback: g.feedback
      };
    });

    res.json({ results: results });
  } catch (error) {
    console.error('[GET RESULTS ERROR]', error);
    res.status(500).json({ error: 'Failed to get results' });
  }
};

exports.getNotifications = async function(req, res) {
  try {
    var student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      return res.status(403).json({ error: 'Student profile not found' });
    }

    var notifications = student.notifications ? student.notifications.sort(function(a, b) {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }) : [];

    res.json({ notifications: notifications });
  } catch (error) {
    console.error('[GET NOTIFICATIONS ERROR]', error);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
};

exports.markNotificationRead = async function(req, res) {
  try {
    var student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      return res.status(403).json({ error: 'Student profile not found' });
    }

    if (student.notifications) {
      var notification = student.notifications.id(req.params.id);
      if (notification) {
        notification.isRead = true;
        await student.save();
      }
    }

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('[MARK NOTIFICATION READ ERROR]', error);
    res.status(500).json({ error: 'Failed to mark notification' });
  }
};