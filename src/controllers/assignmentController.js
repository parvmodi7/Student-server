/**
 * Assignment Controller
 * Handles assignment operations for teachers and students
 * Optimized with caching for assignment lists
 */

// Get all assignments (with filtering)
exports.getAllAssignments = async (req, res) => {
  try {
    const { Assignment } = require('../models');
    const { courseId, dueAfter, dueBefore, type, page = 1, limit = 20 } = req.query;

    const query = {};
    if (courseId) query.course = courseId;
    if (type) query.type = type;
    if (dueAfter || dueBefore) {
      query.dueDate = {};
      if (dueAfter) query.dueDate.$gte = new Date(dueAfter);
      if (dueBefore) query.dueDate.$lte = new Date(dueBefore);
    }

    const assignments = await Assignment.find(query)
      .populate('course', 'name courseCode')
      .populate('teacher', 'firstName lastName')
      .select('-submissions')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ dueDate: 1 });

    const total = await Assignment.countDocuments(query);

    res.json({
      assignments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('[GET ASSIGNMENTS ERROR]', error);
    res.status(500).json({ error: 'Failed to get assignments' });
  }
};

// Get single assignment
exports.getAssignment = async (req, res) => {
  try {
    const { Assignment } = require('../models');
    const assignment = await Assignment.findById(req.params.id)
      .populate('course', 'name courseCode')
      .populate('teacher', 'firstName lastName');

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    res.json({ assignment });
  } catch (error) {
    console.error('[GET ASSIGNMENT ERROR]', error);
    res.status(500).json({ error: 'Failed to get assignment' });
  }
};

// Create assignment (Teacher only)
exports.createAssignment = async (req, res) => {
  try {
    const { Assignment, Teacher, Course } = require('../models');
    
    const teacher = await Teacher.findById(req.user.id);
    if (!teacher) {
      return res.status(403).json({ error: 'Teacher profile not found' });
    }

    // Verify course belongs to teacher
    const course = await Course.findById(req.body.course);
    if (!course || course.teacher.toString() !== teacher._id.toString()) {
      return res.status(403).json({ error: 'Invalid course or not authorized' });
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

// Update assignment (Teacher only)
exports.updateAssignment = async (req, res) => {
  try {
    const { Assignment, Teacher } = require('../models');
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Verify ownership
    const teacher = await Teacher.findById(req.user.id);
    if (!teacher || assignment.teacher.toString() !== teacher._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    Object.assign(assignment, req.body);
    await assignment.save();

    res.json({ assignment });
  } catch (error) {
    console.error('[UPDATE ASSIGNMENT ERROR]', error);
    res.status(500).json({ error: 'Failed to update assignment' });
  }
};

// Submit assignment (Student only)
exports.submitAssignment = async (req, res) => {
  try {
    const { Assignment, Student } = require('../models');
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const student = await Student.findById(req.user.id);
    if (!student) {
      return res.status(403).json({ error: 'Student profile not found' });
    }

    // Check if already submitted
    const existingSubmission = assignment.submissions.find(
      s => s.student.toString() === student._id.toString()
    );
    if (existingSubmission) {
      return res.status(400).json({ error: 'Already submitted' });
    }

    // Check due date
    if (new Date() > assignment.dueDate && !assignment.allowLateSubmission) {
      return res.status(400).json({ error: 'Submission deadline passed' });
    }

    // Add submission
    assignment.submissions.push({
      student: student._id,
      submittedAt: new Date(),
      content: req.body.content,
      attachments: req.body.attachments || []
    });
    await assignment.save();

    res.json({ message: 'Submitted successfully' });
  } catch (error) {
    console.error('[SUBMIT ASSIGNMENT ERROR]', error);
    res.status(500).json({ error: 'Failed to submit' });
  }
};

// Grade submission (Teacher only)
exports.gradeSubmission = async (req, res) => {
  try {
    const { Assignment, Teacher, Student, Grade } = require('../models');
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const teacher = await Teacher.findById(req.user.id);
    if (!teacher || assignment.teacher.toString() !== teacher._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { studentId, grade, feedback } = req.body;
    const submission = assignment.submissions.find(
      s => s.student.toString() === studentId
    );

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Update assignment submission
    submission.grade = grade;
    submission.feedback = feedback;
    submission.gradedAt = new Date();
    submission.gradedBy = teacher._id;
    await assignment.save();

    // Create grade record
    await Grade.findOneAndUpdate(
      { student: studentId, course: assignment.course, assignment: assignment._id },
      {
        student: studentId,
        course: assignment.course,
        assignment: assignment._id,
        grade,
        totalPoints: assignment.totalPoints,
        percentage: (grade / assignment.totalPoints) * 100,
        feedback,
        gradedBy: teacher._id
      },
      { upsert: true }
    );

    res.json({ message: 'Graded successfully', grade: grade });
  } catch (error) {
    console.error('[GRADE SUBMISSION ERROR]', error);
    res.status(500).json({ error: 'Failed to grade' });
  }
};

// Get course assignments (for students)
exports.getCourseAssignments = async (req, res) => {
  try {
    const { Assignment, Student } = require('../models');
    const student = await Student.findById(req.user.id);

    if (!student) {
      return res.status(403).json({ error: 'Student profile not found' });
    }

    const assignments = await Assignment.find({
      course: req.params.courseId,
      isPublished: true
    })
      .populate('teacher', 'firstName lastName')
      .select('-submissions')
      .sort({ dueDate: 1 });

    // Add submission status for each assignment
    const assignmentsWithStatus = assignments.map(a => {
      const submission = a.submissions.find(
        s => s.student.toString() === student._id.toString()
      );
      return {
        ...a.toObject(),
        submitted: !!submission,
        submission: submission || null
      };
    });

    res.json({ assignments: assignmentsWithStatus });
  } catch (error) {
    console.error('[GET COURSE ASSIGNMENTS ERROR]', error);
    res.status(500).json({ error: 'Failed to get assignments' });
  }
};

// Get teacher's assignment submissions
exports.getSubmissions = async (req, res) => {
  try {
    const { Assignment, Teacher } = require('../models');
    const teacher = await Teacher.findById(req.user.id);

    if (!teacher) {
      return res.status(403).json({ error: 'Teacher profile not found' });
    }

    const assignment = await Assignment.findById(req.params.id)
      .populate('submissions.student', 'studentId firstName lastName');

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    if (assignment.teacher.toString() !== teacher._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json({ submissions: assignment.submissions });
  } catch (error) {
    console.error('[GET SUBMISSIONS ERROR]', error);
    res.status(500).json({ error: 'Failed to get submissions' });
  }
};