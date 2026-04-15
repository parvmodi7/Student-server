/**
 * Grade Controller
 * Handles grade operations with caching for frequently accessed grades
 */

// Get student grades
exports.getStudentGrades = async (req, res) => {
  try {
    const { Grade, Student } = require('../models');
    const student = await Student.findOne({ userId: req.user.id });

    if (!student) {
      return res.status(403).json({ error: 'Student profile not found' });
    }

    const { courseId, semester } = req.query;
    const query = { student: student._id };
    if (courseId) query.course = courseId;

    const grades = await Grade.find(query)
      .populate('course', 'name courseCode credits semester year')
      .populate('assignment', 'title totalPoints')
      .sort({ gradedAt: -1 });

    res.json({ grades });
  } catch (error) {
    console.error('[GET STUDENT GRADES ERROR]', error);
    res.status(500).json({ error: 'Failed to get grades' });
  }
};

// Get course grades (Teacher only)
exports.getCourseGrades = async (req, res) => {
  try {
    const { Grade, Teacher, Course } = require('../models');
    const teacher = await Teacher.findOne({ userId: req.user.id });

    if (!teacher) {
      return res.status(403).json({ error: 'Teacher profile not found' });
    }

    const course = await Course.findById(req.params.courseId);
    if (!course || course.teacher.toString() !== teacher._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const grades = await Grade.find({ course: course._id })
      .populate('student', 'studentId firstName lastName')
      .populate('assignment', 'title totalPoints weight');

    // Calculate course statistics
    const stats = {
      average: 0,
      highest: 0,
      lowest: 0,
      count: grades.length
    };

    if (grades.length > 0) {
      const percentages = grades.map(g => g.percentage);
      stats.average = (percentages.reduce((a, b) => a + b, 0) / grades.length).toFixed(2);
      stats.highest = Math.max(...percentages);
      stats.lowest = Math.min(...percentages);
    }

    res.json({ grades, stats });
  } catch (error) {
    console.error('[GET COURSE GRADES ERROR]', error);
    res.status(500).json({ error: 'Failed to get grades' });
  }
};

// Get GPA calculation
exports.getGPA = async (req, res) => {
  try {
    const { Grade, Student } = require('../models');
    const student = await Student.findOne({ userId: req.user.id });

    if (!student) {
      return res.status(403).json({ error: 'Student profile not found' });
    }

    const grades = await Grade.find({ student: student._id })
      .populate('course', 'credits');

    let totalPoints = 0;
    let totalCredits = 0;

    grades.forEach(grade => {
      const gpa = getGPAPoints(grade.letterGrade);
      const credits = grade.course?.credits || 3;
      totalPoints += gpa * credits;
      totalCredits += credits;
    });

    const gpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : 0;

    res.json({ gpa, totalCredits, totalCourses: grades.length });
  } catch (error) {
    console.error('[GET GPA ERROR]', error);
    res.status(500).json({ error: 'Failed to calculate GPA' });
  }
};

// Helper function for GPA calculation
const getGPAPoints = (letterGrade) => {
  const gradePoints = {
    'A+': 4.0, 'A': 4.0, 'A-': 3.7,
    'B+': 3.3, 'B': 3.0, 'B-': 2.7,
    'C+': 2.3, 'C': 2.0, 'C-': 1.7,
    'D+': 1.3, 'D': 1.0, 'D-': 0.7,
    'F': 0.0
  };
  return gradePoints[letterGrade] || 0;
};