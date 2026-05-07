/**
 * Email Controller
 * Handles AI-powered student report email sending
 * Uses Gemini for analysis and Resend for delivery
 */

const { Teacher, Student, Course, Grade } = require('../models');
const { callGemini } = require('../services/geminiService');
const { sendReportEmail } = require('../services/emailService');

/**
 * Get students with their report data for the email dialog
 * GET /api/email/students
 */
exports.getStudentsForReport = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.user.id);
    if (!teacher) {
      return res.status(403).json({ error: 'Teacher profile not found' });
    }

    // Get all courses taught by this teacher
    const courses = await Course.find({ teacher: teacher._id });
    
    // Collect unique student IDs across all courses
    const uniqueStudentIds = new Set();
    const studentCourseMap = {};

    courses.forEach(course => {
      (course.enrolledStudents || []).forEach(studentId => {
        const sid = studentId.toString();
        uniqueStudentIds.add(sid);
        if (!studentCourseMap[sid]) studentCourseMap[sid] = [];
        studentCourseMap[sid].push({
          _id: course._id,
          name: course.name,
          courseCode: course.courseCode,
        });
      });
    });

    // Fetch students
    const students = await Student.find({
      _id: { $in: Array.from(uniqueStudentIds) }
    }).select('firstName lastName email studentId gpa pastGpa semester attendance');

    // Calculate attendance for each student
    const studentsWithData = students.map(s => {
      // Calculate average attendance across enrolled courses
      let totalAttendance = 0;
      let courseCount = 0;

      const enrolledCourses = studentCourseMap[s._id.toString()] || [];

      for (const courseInfo of enrolledCourses) {
        const course = courses.find(c => c._id.toString() === courseInfo._id.toString());
        if (course && course.attendance) {
          // Count attendance for this student in this course
          let present = 0;
          let total = 0;
          for (const [date, records] of Object.entries(course.attendance)) {
            if (records && typeof records === 'object') {
              const record = records[s._id.toString()];
              if (record !== undefined) {
                total++;
                if (record.present || record === true) present++;
              }
            }
          }
          if (total > 0) {
            totalAttendance += (present / total) * 100;
            courseCount++;
          }
        }
      }

      const avgAttendance = courseCount > 0 ? totalAttendance / courseCount : 0;

      return {
        _id: s._id,
        firstName: s.firstName,
        lastName: s.lastName,
        name: `${s.firstName} ${s.lastName}`,
        email: s.email,
        studentId: s.studentId,
        gpa: s.gpa,
        pastGpa: s.pastGpa,
        semester: s.semester,
        attendance: Math.round(avgAttendance * 100) / 100,
        courses: enrolledCourses,
      };
    });

    res.json({
      students: studentsWithData,
      teacherName: `${teacher.firstName} ${teacher.lastName}`,
    });
  } catch (error) {
    console.error('[GET STUDENTS FOR REPORT ERROR]', error);
    res.status(500).json({ error: 'Failed to get students for report' });
  }
};

/**
 * Send AI-powered report email to a student
 * POST /api/email/send-report
 * Body: { studentId: string }
 */
exports.sendStudentReport = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.user.id);
    if (!teacher) {
      return res.status(403).json({ error: 'Teacher profile not found' });
    }

    const { studentId } = req.body;
    if (!studentId) {
      return res.status(400).json({ error: 'Student ID is required' });
    }

    // Fetch student
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Get all courses where this student is enrolled (taught by this teacher)
    const courses = await Course.find({
      teacher: teacher._id,
      enrolledStudents: student._id,
    });

    // Get grades for this student
    const grades = await Grade.find({
      student: student._id,
      course: { $in: courses.map(c => c._id) },
    }).populate('course', 'name courseCode');

    // Calculate attendance across all courses
    let totalAttendance = 0;
    let courseCount = 0;
    const courseAttendanceDetails = [];

    for (const course of courses) {
      if (course.attendance) {
        let present = 0;
        let total = 0;
        for (const [date, records] of Object.entries(course.attendance)) {
          if (records && typeof records === 'object') {
            const record = records[student._id.toString()];
            if (record !== undefined) {
              total++;
              if (record.present || record === true) present++;
            }
          }
        }
        if (total > 0) {
          const pct = (present / total) * 100;
          totalAttendance += pct;
          courseCount++;
          courseAttendanceDetails.push({
            course: course.name,
            attendance: Math.round(pct),
            present,
            total,
          });
        }
      }
    }

    const avgAttendance = courseCount > 0 ? totalAttendance / courseCount : 0;

    // Calculate average GPA from past GPAs
    const pastGpaValues = (student.pastGpa || []).map(p => p.gpa).filter(g => g > 0);
    const avgGpa = pastGpaValues.length > 0
      ? parseFloat((pastGpaValues.reduce((a, b) => a + b, 0) / pastGpaValues.length).toFixed(2))
      : student.gpa;

    // Generate AI analysis using Gemini
    const aiPrompt = `You are an expert academic advisor. Analyze the following student data and provide a comprehensive performance report.

STUDENT DATA:
- Name: ${student.firstName} ${student.lastName}
- Current GPA: ${student.gpa}/4.00
- Average GPA across semesters: ${avgGpa}/4.00
- GPA History: ${JSON.stringify((student.pastGpa || []).map(p => ({ semester: p.semester, gpa: p.gpa })))}
- Overall Attendance: ${avgAttendance.toFixed(1)}%
- Course-wise Attendance: ${JSON.stringify(courseAttendanceDetails)}
- Enrolled Courses: ${courses.map(c => c.name).join(', ')}
- Grades: ${JSON.stringify(grades.map(g => ({ course: g.course?.name, grade: g.grade, percentage: g.percentage, letterGrade: g.letterGrade })))}
- Current Semester: ${student.semester || 'N/A'}

Provide your analysis in the following JSON format:
{
  "overallSummary": "A 2-3 sentence executive summary of the student's performance",
  "strengths": "Specific strengths observed in their academic performance",
  "areasForImprovement": "Specific areas where the student needs to improve",
  "recommendations": "3-4 actionable recommendations for the student",
  "gpaTrendAnalysis": "Analysis of their GPA trend over semesters",
  "attendanceInsights": "Insights about their attendance pattern and its impact"
}`;

    const aiAnalysis = await callGemini(
      aiPrompt,
      'You are an expert academic performance analyst. Provide insightful, encouraging, and actionable analysis. Be specific with data references. Keep each section concise (2-3 sentences max).',
      true,
      null,
      true // Skip cache for unique reports
    );

    // Send email via Resend
    const reportDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const result = await sendReportEmail({
      to: student.email,
      studentName: `${student.firstName} ${student.lastName}`,
      reportData: {
        studentName: `${student.firstName} ${student.lastName}`,
        studentId: student.studentId,
        gpa: student.gpa,
        pastGpa: student.pastGpa,
        attendance: avgAttendance,
        courses: courses.map(c => ({ name: c.name, courseCode: c.courseCode })),
        aiAnalysis: typeof aiAnalysis === 'string' ? JSON.parse(aiAnalysis) : aiAnalysis,
        teacherName: `${teacher.firstName} ${teacher.lastName}`,
        reportDate,
      },
    });

    res.json({
      message: 'Report sent successfully',
      emailId: result?.id,
      studentName: `${student.firstName} ${student.lastName}`,
      studentEmail: student.email,
    });
  } catch (error) {
    console.error('[SEND STUDENT REPORT ERROR]', error);
    res.status(500).json({ error: error.message || 'Failed to send report email' });
  }
};
