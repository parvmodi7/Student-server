/**
 * Student Controller
 * Handles student-specific dashboard and data operations
 * Uses Student model directly (no User model)
 */

const { Student, Course, Assignment, Grade, Schedule } = require('../models');
const websocketService = require('../services/websocket');

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
    const student = await Student.findById(req.user.id);
    if (!student) {
      return res.status(403).json({ error: 'Student profile not found' });
    }

    const courses = await Course.find({ _id: { $in: student.enrolledCourses } })
      .populate('teacher', 'firstName lastName');

    const grades = await Grade.find({ student: student._id })
      .populate('course', 'name courseCode credits');

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
      dueDate: { $gte: new Date() }
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
    if (student.attendance) {
      student.attendance.forEach(function(a) {
        totalPresent += a.present || 0;
        totalClasses += a.total || 0;
      });
    }
    var attendance = totalClasses > 0 ? Math.round((totalPresent / totalClasses) * 100) : 0;

    res.json({
      student: {
        id: student.studentId,
        firstName: student.firstName,
        lastName: student.lastName,
        name: ((student.firstName || '') + ' ' + (student.lastName || '')).trim() || 'Student',
        email: student.email,
        major: student.major,
        semester: student.enrolledCourses ? student.enrolledCourses.length : 0,
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
          percentage: g.percentage ? g.percentage.toFixed(1) : 'N/A',
          pdfUrl: g.pdfUrl || null,
          title: g.title || null,
          marksObtained: g.grade,
          totalMarks: g.totalPoints
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
    var student = await Student.findById(req.user.id);
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
    var student = await Student.findById(req.user.id);
    if (!student) {
      return res.status(403).json({ error: 'Student profile not found' });
    }

    var status = req.query.status;
    var query = { course: { $in: student.enrolledCourses } };
    
    if (status === 'pending') {
      query.dueDate = { $gte: new Date() };
    } else if (status === 'submitted') {
      query.dueDate = { $lt: new Date() };
    }

    var assignments = await Assignment.find(query)
      .populate('course', 'name courseCode')
      .sort({ dueDate: 1 });

    var assignmentsWithStatus = assignments.map(function(a) {
      var submission = a.submissions ? a.submissions.find(function(s) {
        return s.student.toString() === student._id.toString();
      }) : null;
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
        grade: submission ? submission.grade : null,
        pdfUrl: a.pdfUrl
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
    var student = await Student.findById(req.user.id);
    if (!student) {
      return res.status(403).json({ error: 'Student profile not found' });
    }

    var grades = await Grade.find({ student: student._id })
      .populate({ path: 'course', select: 'name courseCode' })
      .sort({ gradedAt: -1 });

    var results = grades.map(function(g) {
      return {
        id: g._id,
        course: g.course ? g.course.name : 'Unknown',
        courseCode: g.course ? g.course.courseCode : '',
        title: g.title || 'Course Grade',
        type: 'overall',
        examDate: g.gradedAt,
        marksObtained: g.grade,
        totalMarks: g.totalPoints,
        grade: g.letterGrade,
        feedback: g.feedback,
        pdfUrl: g.pdfUrl
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
    var student = await Student.findById(req.user.id);
    if (!student) {
      return res.status(403).json({ error: 'Student profile not found' });
    }

    var notifications = student.notifications ? student.notifications.sort(function(a, b) {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }) : [];

    // Auto-delete notifications older than 5 days
    var fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    var originalCount = student.notifications ? student.notifications.length : 0;
    student.notifications = student.notifications ? student.notifications.filter(function(n) {
      return new Date(n.createdAt) > fiveDaysAgo;
    }) : [];
    if (student.notifications.length < originalCount) {
      await student.save();
      console.log('[NOTIFICATIONS] Auto-deleted ' + (originalCount - student.notifications.length) + ' old notifications');
    }

    res.json({ notifications: student.notifications });
  } catch (error) {
    console.error('[GET NOTIFICATIONS ERROR]', error);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
};

exports.markNotificationRead = async function(req, res) {
  try {
    var student = await Student.findById(req.user.id);
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

// Function to add a notification and broadcast via WebSocket
exports.addNotification = async function(studentId, notificationData) {
  try {
    var student = await Student.findById(studentId);
    if (!student) {
      console.error('[ADD NOTIFICATION] Student not found:', studentId);
      return;
    }

    if (!student.notifications) {
      student.notifications = [];
    }

    // Use _id from notificationData if provided, otherwise create new ObjectId
    var notification = {
      _id: notificationData._id || require('mongoose').Types.ObjectId(),
      title: notificationData.title,
      message: notificationData.message,
      type: notificationData.type || 'info',
      isRead: false,
      createdAt: new Date()
    };

    student.notifications.unshift(notification);
    await student.save();

    // Broadcast to student via WebSocket
    websocketService.notifyStudent(studentId, {
      type: 'new_notification',
      notification: notification
    });

    console.log('[ADD NOTIFICATION] Notification added for student:', studentId);
    return notification;
  } catch (error) {
    console.error('[ADD NOTIFICATION ERROR]', error);
    throw error;
  }
};

// Get courses with PYQ availability for the student
exports.getPyqCourses = async function(req, res) {
  try {
    var student = await Student.findById(req.user.id);
    if (!student) {
      return res.status(403).json({ error: 'Student profile not found' });
    }

    var courses = await Course.find({ _id: { $in: student.enrolledCourses } });

    var { Pyq } = require('../models');
    var coursesWithPyq = await Promise.all(courses.map(async function(course) {
      var pyqs = await Pyq.find({ course: course._id }).sort({ year: -1 });
      return {
        _id: course._id,
        name: course.name,
        courseCode: course.courseCode,
        hasPyq: pyqs.length > 0,
        pyqCount: pyqs.length,
        pyqYears: pyqs.map(function(p) { return p.year; })
      };
    }));

    res.json({ courses: coursesWithPyq });
  } catch (error) {
    console.error('[GET PYQ COURSES ERROR]', error);
    res.status(500).json({ error: 'Failed to get PYQ courses' });
  }
};

// Generate AI predicted paper from PYQ papers
exports.generatePaper = async function(req, res) {
  try {
    var student = await Student.findById(req.user.id);
    if (!student) {
      return res.status(403).json({ error: 'Student profile not found' });
    }

    var { courseId } = req.body;
    if (!courseId) {
      return res.status(400).json({ error: 'Course ID is required' });
    }

    var course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    var { Pyq } = require('../models');
    var pyqs = await Pyq.find({ course: courseId }).sort({ year: -1 });

    if (pyqs.length === 0) {
      return res.status(400).json({ error: 'No PYQ papers available for this course' });
    }

    // Download PDF content from each PYQ
    var axios = require('axios');
    var pdfParse;
    try {
      pdfParse = require('pdf-parse');
    } catch (e) {
      console.log('[GENERATE PAPER] pdf-parse not available, using URL references only');
      pdfParse = null;
    }

    var paperTexts = [];
    for (var pyq of pyqs) {
      try {
        if (pdfParse && pyq.pdfUrl) {
          var response = await axios.get(pyq.pdfUrl, { responseType: 'arraybuffer', timeout: 15000 });
          var pdfData = await pdfParse(Buffer.from(response.data));
          paperTexts.push({
            year: pyq.year,
            content: pdfData.text.substring(0, 8000) // Limit text to avoid token overflow
          });
        } else {
          paperTexts.push({
            year: pyq.year,
            content: `[PDF from year ${pyq.year} - URL: ${pyq.pdfUrl}]`
          });
        }
      } catch (downloadErr) {
        console.error('[GENERATE PAPER] Failed to parse PDF for year', pyq.year, downloadErr.message);
        paperTexts.push({
          year: pyq.year,
          content: `[PDF from year ${pyq.year} - could not parse content]`
        });
      }
    }

    var yearsString = paperTexts.map(function(p) { return p.year; }).join(', ');
    var papersContent = paperTexts.map(function(p) {
      return `=== YEAR ${p.year} PAPER ===\n${p.content}`;
    }).join('\n\n');

    var prompt = `You are an expert exam paper predictor for the course "${course.name}" (${course.courseCode || ''}).

I have ${pyqs.length} previous year question papers from years: ${yearsString}.

Here are the contents of the previous year papers:

${papersContent}

Based on careful analysis of these ${pyqs.length} previous year papers, generate a PREDICTED exam paper that would be 50-80% accurate for the upcoming exam.

Your analysis approach:
1. Identify REPEATED questions that appear across multiple years (these are HIGH PRIORITY - likely to appear again)
2. Identify IMPORTANT topics that are consistently tested
3. Identify PATTERNS in question types, marks distribution, and difficulty progression
4. Create questions that are similar in style and difficulty to the originals
5. Include a mix of repeated/commonly asked questions (60-70%) and predicted new questions (30-40%)

Generate the paper in this JSON format:
{
  "paperTitle": "Predicted Exam Paper - ${course.name}",
  "courseName": "${course.name}",
  "courseCode": "${course.courseCode || ''}",
  "totalMarks": 100,
  "duration": "3 hours",
  "accuracyEstimate": <number between 50-80>,
  "sections": [
    {
      "sectionName": "Section A - Short Answer Questions",
      "sectionMarks": 30,
      "instructions": "Answer all questions",
      "questions": [
        {
          "questionNumber": 1,
          "question": "Full question text",
          "marks": 5,
          "isRepeated": true,
          "repeatedFromYears": [2024, 2023],
          "confidence": "High/Medium/Low",
          "topic": "topic name"
        }
      ]
    },
    {
      "sectionName": "Section B - Long Answer Questions",
      "sectionMarks": 50,
      "instructions": "Answer any 5 out of 7",
      "questions": [...]
    },
    {
      "sectionName": "Section C - Numerical/Application Questions",
      "sectionMarks": 20,
      "instructions": "Answer all questions",
      "questions": [...]
    }
  ],
  "analysisNotes": "Brief analysis of patterns found across previous year papers",
  "topRepeatedTopics": ["topic1", "topic2", "topic3"],
  "studyRecommendations": ["recommendation1", "recommendation2"]
}

Make the paper realistic with proper marks distribution totaling 100 marks. Include at least 15-20 questions across all sections.`;

    var systemPrompt = `You are an expert academic exam paper predictor. You analyze previous year question papers to predict upcoming exam questions with high accuracy. Focus on identifying repeated patterns, commonly tested topics, and question styles. Generate realistic, well-structured exam papers.`;

    var { callGemini } = require('../services/geminiService');
    var result = await callGemini(prompt, systemPrompt, true);

    res.json({ paper: result });
  } catch (error) {
    console.error('[GENERATE PAPER ERROR]', error);
    var isQuotaError = error.message?.includes('quota') || error.message?.includes('429');
    res.status(isQuotaError ? 429 : 500).json({
      error: isQuotaError ? 'AI is busy right now. Please try again in a moment.' : 'Failed to generate paper. Please try again.',
      quotaExceeded: isQuotaError
    });
  }
};

