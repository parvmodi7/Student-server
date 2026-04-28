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

// Generate AI predicted paper from PYQ papers — unique every time with increasing accuracy
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

    var { Pyq, PaperGeneration } = require('../models');
    var pyqs = await Pyq.find({ course: courseId }).sort({ year: -1 });

    if (pyqs.length === 0) {
      return res.status(400).json({ error: 'No PYQ papers available for this course' });
    }

    // Get previous generation history for this student + course
    var previousGens = await PaperGeneration.find({
      student: student._id,
      course: courseId
    }).sort({ createdAt: -1 }).limit(5);

    var generationNumber = previousGens.length + 1;

    // Calculate accuracy: starts at 55%, increases with more PYQs and generations
    // Formula: base(55) + pyqBonus(up to 15) + generationBonus(up to 10) — capped at 85
    var pyqBonus = Math.min(pyqs.length * 3, 15);
    var generationBonus = Math.min(previousGens.length * 2, 10);
    var accuracyEstimate = Math.min(55 + pyqBonus + generationBonus, 85);

    // Gather previously covered topics to avoid repetition
    var previousTopics = [];
    previousGens.forEach(function(gen) {
      if (gen.topicsFocused && gen.topicsFocused.length > 0) {
        previousTopics = previousTopics.concat(gen.topicsFocused);
      }
    });
    var uniquePreviousTopics = [...new Set(previousTopics)];

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
            content: pdfData.text.substring(0, 8000)
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

    // Generate a random seed + variation instructions for uniqueness
    var randomSeed = Math.random().toString(36).substring(2, 10);
    var timestamp = Date.now();
    var variationStyles = [
      'Focus on application-based and analytical questions',
      'Emphasize conceptual understanding and theory-based questions',
      'Mix practical problem-solving with short definition questions',
      'Prioritize numerical and computation-heavy questions',
      'Blend comparative analysis questions with factual recall',
      'Focus on case-study style and scenario-based questions',
      'Emphasize diagram-based and explanation-heavy questions',
      'Mix objective-type with subjective long-answer questions'
    ];
    var styleIndex = (timestamp + generationNumber) % variationStyles.length;
    var chosenStyle = variationStyles[styleIndex];

    // Build avoidance instruction from previous generations
    var avoidanceInstruction = '';
    if (uniquePreviousTopics.length > 0) {
      avoidanceInstruction = `\n\nIMPORTANT: This is generation #${generationNumber} for this student. Previous papers already covered these topics heavily: ${uniquePreviousTopics.slice(0, 10).join(', ')}. 
You MUST vary the questions significantly — choose DIFFERENT sub-topics, rephrase questions differently, change the marks distribution, and alter the question style. DO NOT repeat the same questions from previous generations.`;
    }

    var prompt = `You are an expert exam paper predictor for the course "${course.name}" (${course.courseCode || ''}).
GENERATION SEED: ${randomSeed}-${timestamp}
GENERATION #${generationNumber} | STYLE: ${chosenStyle}

I have ${pyqs.length} previous year question papers from years: ${yearsString}.

Here are the contents of the previous year papers:

${papersContent}

Based on careful analysis of these ${pyqs.length} previous year papers, generate a UNIQUE PREDICTED exam paper.

Your analysis approach:
1. Identify REPEATED questions that appear across multiple years (HIGH PRIORITY)
2. Identify IMPORTANT topics that are consistently tested
3. Identify PATTERNS in question types, marks distribution, and difficulty progression
4. Create questions that are similar in STYLE but DIFFERENT in specific content from any previous generation
5. Include a mix of repeated/commonly asked patterns (50-60%) and fresh predicted questions (40-50%)
6. Style focus for this generation: ${chosenStyle}
${avoidanceInstruction}

CRITICAL RULES FOR UNIQUENESS:
- Every generation MUST produce different questions even for the same course
- Rephrase repeated-pattern questions in new ways each time
- Vary the specific sub-topics, examples, and numerical values used
- Change the section structure and marks weightage slightly each time
- Use the generation seed ${randomSeed} to randomize your choices

Generate the paper in this JSON format:
{
  "paperTitle": "Predicted Exam Paper ${generationNumber > 1 ? '(Set ' + generationNumber + ')' : ''} - ${course.name}",
  "courseName": "${course.name}",
  "courseCode": "${course.courseCode || ''}",
  "totalMarks": 100,
  "duration": "3 hours",
  "accuracyEstimate": ${accuracyEstimate},
  "generationNumber": ${generationNumber},
  "sections": [
    {
      "sectionName": "Section A - Short Answer Questions",
      "sectionMarks": <vary between 20-35>,
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
      "sectionMarks": <vary between 40-55>,
      "instructions": "Answer any 5 out of 7",
      "questions": [...]
    },
    {
      "sectionName": "Section C - Numerical/Application Questions",
      "sectionMarks": <remaining marks to total 100>,
      "instructions": "Answer all questions",
      "questions": [...]
    }
  ],
  "analysisNotes": "Brief analysis of patterns found across previous year papers and what's different in this generation",
  "topRepeatedTopics": ["topic1", "topic2", "topic3", "topic4", "topic5"],
  "studyRecommendations": ["recommendation1", "recommendation2", "recommendation3"]
}

Make the paper realistic with proper marks distribution totaling 100 marks. Include at least 15-20 questions across all sections. Ensure this paper is COMPLETELY DIFFERENT from any previous generation.`;

    var systemPrompt = `You are an expert academic exam paper predictor. You analyze previous year question papers to predict upcoming exam questions with high accuracy. 
IMPORTANT: Each time you are called, you MUST generate a completely UNIQUE paper with different questions, different phrasing, and different topic emphasis. 
Use the generation seed provided to randomize your output. Never produce the same paper twice. Focus on identifying repeated patterns and commonly tested topics while varying the specific questions each time.
Current accuracy level: ${accuracyEstimate}% (based on ${pyqs.length} PYQs analyzed and ${generationNumber - 1} previous generations).`;

    var { callGemini } = require('../services/geminiService');
    // Use skipCache=true to ensure unique paper every time
    var result = await callGemini(prompt, systemPrompt, true, null, true);

    // Ensure accuracy estimate is set correctly
    if (result && typeof result === 'object') {
      result.accuracyEstimate = accuracyEstimate;
      result.generationNumber = generationNumber;
    }

    // Save generation history for future accuracy improvement and variation
    var topicsFocused = [];
    if (result && result.topRepeatedTopics) {
      topicsFocused = result.topRepeatedTopics;
    }
    if (result && result.sections) {
      result.sections.forEach(function(section) {
        if (section.questions) {
          section.questions.forEach(function(q) {
            if (q.topic && !topicsFocused.includes(q.topic)) {
              topicsFocused.push(q.topic);
            }
          });
        }
      });
    }

    await PaperGeneration.create({
      student: student._id,
      course: courseId,
      generationNumber: generationNumber,
      accuracyEstimate: accuracyEstimate,
      paperTitle: result?.paperTitle || `Predicted Paper Set ${generationNumber}`,
      topicsFocused: topicsFocused.slice(0, 20),
      pyqCount: pyqs.length
    });

    res.json({
      paper: result,
      generationNumber: generationNumber,
      accuracyEstimate: accuracyEstimate,
      previousGenerations: previousGens.length
    });
  } catch (error) {
    console.error('[GENERATE PAPER ERROR]', error);
    var isQuotaError = error.message?.includes('quota') || error.message?.includes('429');
    res.status(isQuotaError ? 429 : 500).json({
      error: isQuotaError ? 'AI is busy right now. Please try again in a moment.' : 'Failed to generate paper. Please try again.',
      quotaExceeded: isQuotaError
    });
  }
};

