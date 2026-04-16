/**
 * Question Controller
 * Handles CRUD operations for exam questions
 */
const { Question, Course } = require('../models');

// Get questions by subject (for student exam)
exports.getQuestionsBySubject = async (req, res) => {
  try {
    const { subject } = req.params;
    
    const questions = await Question.find({ 
      subject: { $regex: new RegExp(subject, 'i') },
      isActive: true 
    }).populate('teacher', 'firstName lastName').select('-idealAnswer');

    res.json({ 
      questions: questions.map(q => ({
        _id: q._id,
        subject: q.subject,
        question: q.question,
        type: q.type,
        options: q.type === 'multiple-choice' ? q.options : undefined,
        hint: q.hint,
        marks: q.marks,
        difficulty: q.difficulty
      })),
      total: questions.length 
    });
  } catch (error) {
    console.error('[GET QUESTIONS ERROR]', error);
    res.status(500).json({ error: 'Failed to get questions' });
  }
};

// Get questions by course (for student exam)
exports.getQuestionsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    
    const questions = await Question.find({ 
      course: courseId,
      isActive: true 
    }).populate('teacher', 'firstName lastName').select('-idealAnswer');

    res.json({ 
      questions: questions.map(q => ({
        _id: q._id,
        subject: q.subject,
        question: q.question,
        type: q.type,
        options: q.type === 'multiple-choice' ? q.options : undefined,
        hint: q.hint,
        marks: q.marks,
        difficulty: q.difficulty
      })),
      total: questions.length 
    });
  } catch (error) {
    console.error('[GET QUESTIONS BY COURSE ERROR]', error);
    res.status(500).json({ error: 'Failed to get questions' });
  }
};

// Create question (Teacher only)
exports.createQuestion = async (req, res) => {
  try {
    const { course, subject, question, type, options, idealAnswer, hint, marks, difficulty } = req.body;

    if (!course || !subject || !question) {
      return res.status(400).json({ error: 'Course, subject and question are required' });
    }

    const newQuestion = await Question.create({
      course,
      teacher: req.user.id,
      subject,
      question,
      type: type || 'theory',
      options: type === 'multiple-choice' ? options : undefined,
      idealAnswer: idealAnswer || '',
      hint: hint || '',
      marks: marks || 10,
      difficulty: difficulty || 'Medium'
    });

    res.status(201).json({ 
      message: 'Question created successfully',
      question: newQuestion 
    });
  } catch (error) {
    console.error('[CREATE QUESTION ERROR]', error);
    res.status(500).json({ error: 'Failed to create question' });
  }
};

// Update question (Teacher only)
exports.updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const question = await Question.findById(id);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    if (question.teacher.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this question' });
    }

    Object.assign(question, updates);
    await question.save();

    res.json({ 
      message: 'Question updated successfully',
      question 
    });
  } catch (error) {
    console.error('[UPDATE QUESTION ERROR]', error);
    res.status(500).json({ error: 'Failed to update question' });
  }
};

// Delete question (Teacher only)
exports.deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    const question = await Question.findById(id);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    if (question.teacher.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this question' });
    }

    question.isActive = false;
    await question.save();

    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('[DELETE QUESTION ERROR]', error);
    res.status(500).json({ error: 'Failed to delete question' });
  }
};

// Get all questions for a teacher
exports.getTeacherQuestions = async (req, res) => {
  try {
    const { courseId } = req.query;
    
    const query = { teacher: req.user.id };
    if (courseId) {
      query.course = courseId;
    }

    const questions = await Question.find(query)
      .populate('course', 'name courseCode')
      .sort({ createdAt: -1 });

    res.json({ questions });
  } catch (error) {
    console.error('[GET TEACHER QUESTIONS ERROR]', error);
    res.status(500).json({ error: 'Failed to get questions' });
  }
};

// Get question with answer (for grading)
exports.getQuestionWithAnswer = async (req, res) => {
  try {
    const { id } = req.params;
    
    const question = await Question.findById(id).select('+idealAnswer');
    
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    res.json({ question });
  } catch (error) {
    console.error('[GET QUESTION WITH ANSWER ERROR]', error);
    res.status(500).json({ error: 'Failed to get question' });
  }
};
