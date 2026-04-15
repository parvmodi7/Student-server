/**
 * PDF Report Generation Service
 * Generates academic reports for students
 */

const { Student, Teacher, Course, Grade, Assignment } = require('../models');

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

function getLetterGrade(percentage) {
  if (percentage >= 93) return 'A';
  if (percentage >= 90) return 'A-';
  if (percentage >= 87) return 'B+';
  if (percentage >= 83) return 'B';
  if (percentage >= 80) return 'B-';
  if (percentage >= 77) return 'C+';
  if (percentage >= 73) return 'C';
  if (percentage >= 70) return 'C-';
  if (percentage >= 67) return 'D+';
  if (percentage >= 63) return 'D';
  if (percentage >= 60) return 'D-';
  return 'F';
}

exports.generateStudentReport = async (req, res) => {
  try {
    const student = await Student.findById(req.user.id);
    if (!student) {
      return res.status(403).json({ error: 'Student profile not found' });
    }

    const courses = await Course.find({ _id: { $in: student.enrolledCourses } })
      .populate('teacher', 'firstName lastName');

    const grades = await Grade.find({ student: student._id })
      .populate('course', 'name courseCode credits')
      .populate('assignment', 'title type');

    const upcomingAssignments = await Assignment.find({
      course: { $in: student.enrolledCourses },
      dueDate: { $gte: new Date() },
      isPublished: true
    }).populate('course', 'name').limit(5);

    let totalPoints = 0;
    let totalCredits = 0;
    grades.forEach(g => {
      const gpa = getGPAPoints(g.letterGrade);
      const credits = g.course?.credits || 3;
      totalPoints += gpa * credits;
      totalCredits += credits;
    });
    const gpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00';

    const gradeDistribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    grades.forEach(g => {
      const letter = g.letterGrade?.charAt(0) || 'F';
      if (gradeDistribution[letter] !== undefined) {
        gradeDistribution[letter]++;
      }
    });

    const report = {
      student: {
        name: `${student.firstName} ${student.lastName}`,
        studentId: student.studentId,
        major: student.major,
        graduationYear: student.graduationYear,
        totalCredits,
        generatedAt: new Date().toISOString()
      },
      academicSummary: {
        currentGPA: parseFloat(gpa),
        totalCredits,
        totalCourses: courses.length,
        totalGrades: grades.length
      },
      gradeDistribution,
      courses: courses.map(c => {
        const courseGrades = grades.filter(g => g.course?._id.toString() === c._id.toString());
        const avg = courseGrades.length > 0 
          ? (courseGrades.reduce((sum, g) => sum + g.percentage, 0) / courseGrades.length).toFixed(1)
          : 'N/A';
        return {
          name: c.name,
          code: c.courseCode,
          credits: c.credits,
          teacher: c.teacher ? `Prof. ${c.teacher.firstName} ${c.teacher.lastName}` : 'TBA',
          average: avg,
          schedule: c.schedule
        };
      }),
      recentGrades: grades.slice(0, 10).map(g => ({
        course: g.course?.name,
        assignment: g.assignment?.title || 'Overall',
        grade: g.letterGrade,
        percentage: g.percentage ? g.percentage.toFixed(1) : 'N/A',
        date: g.gradedAt
      })),
      upcomingDeadlines: upcomingAssignments.map(a => ({
        title: a.title,
        course: a.course?.name,
        dueDate: a.dueDate,
        points: a.totalPoints
      }))
    };

    res.json({ report });
  } catch (error) {
    console.error('[GENERATE REPORT ERROR]', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
};

exports.generateTeacherCourseReport = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.user.id);
    if (!teacher) {
      return res.status(403).json({ error: 'Teacher profile not found' });
    }

    const course = await Course.findById(req.params.courseId);
    if (!course || course.teacher.toString() !== teacher._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const students = await Student.find({ _id: { $in: course.enrolledStudents } });

    const assignments = await Assignment.find({ course: course._id });
    const grades = await Grade.find({ course: course._id });

    const gradeDistribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    const studentStats = [];
    
    for (const student of students) {
      const studentGrades = grades.filter(g => g.student.toString() === student._id.toString());
      const avg = studentGrades.length > 0
        ? studentGrades.reduce((sum, g) => sum + g.percentage, 0) / studentGrades.length
        : 0;
      
      const letterGrade = getLetterGrade(avg);
      const letter = letterGrade.charAt(0);
      if (gradeDistribution[letter] !== undefined) {
        gradeDistribution[letter]++;
      }

      studentStats.push({
        name: `${student.firstName} ${student.lastName}`,
        studentId: student.studentId,
        average: avg.toFixed(1),
        letterGrade,
        assignmentsCompleted: studentGrades.length
      });
    }

    const classAverage = grades.length > 0
      ? (grades.reduce((sum, g) => sum + g.percentage, 0) / grades.length).toFixed(1)
      : 'N/A';

    const report = {
      course: {
        name: course.name,
        code: course.courseCode,
        semester: `${course.semester} ${course.year}`,
        enrolled: students.length,
        maxStudents: course.maxStudents
      },
      statistics: {
        classAverage: parseFloat(classAverage),
        totalStudents: students.length,
        totalAssignments: assignments.length,
        totalGrades: grades.length
      },
      gradeDistribution,
      assignments: assignments.map(a => ({
        title: a.title,
        type: a.type,
        dueDate: a.dueDate,
        totalPoints: a.totalPoints,
        submissions: a.submissions ? a.submissions.length : 0,
        averageScore: a.submissions && a.submissions.length > 0
          ? (a.submissions.reduce((sum, s) => sum + (s.grade || 0), 0) / a.submissions.length).toFixed(1)
          : 'N/A'
      })),
      studentPerformance: studentStats.sort((a, b) => parseFloat(b.average) - parseFloat(a.average))
    };

    res.json({ report });
  } catch (error) {
    console.error('[GENERATE COURSE REPORT ERROR]', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
};
