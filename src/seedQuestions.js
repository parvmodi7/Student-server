/**
 * Seed MCQ Questions
 * Seeds 30+ multiple-choice questions across 3 subjects
 */
require('dotenv').config();
const mongoose = require('mongoose');

const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  ('MongoDB Connected');
};

const questions = [
  // === DATA STRUCTURES (10 questions) ===
  // Easy
  { subject: 'Data Structures', difficulty: 'Easy', question: 'What is the time complexity of accessing an element in an array by index?', options: [{ text: 'O(1)', isCorrect: true }, { text: 'O(n)', isCorrect: false }, { text: 'O(log n)', isCorrect: false }, { text: 'O(n²)', isCorrect: false }], hint: 'Arrays provide direct access via memory offset.', explanation: 'Arrays store elements in contiguous memory, so accessing any element by index is a constant-time O(1) operation using base address + offset calculation.' },
  { subject: 'Data Structures', difficulty: 'Easy', question: 'Which data structure follows the FIFO (First In, First Out) principle?', options: [{ text: 'Stack', isCorrect: false }, { text: 'Queue', isCorrect: true }, { text: 'Tree', isCorrect: false }, { text: 'Graph', isCorrect: false }], hint: 'Think of a line of people waiting.', explanation: 'A Queue follows FIFO — the first element added is the first one removed, like a line at a store.' },
  { subject: 'Data Structures', difficulty: 'Easy', question: 'What does LIFO stand for in the context of stacks?', options: [{ text: 'Last In First Out', isCorrect: true }, { text: 'Last In Final Order', isCorrect: false }, { text: 'Linear Input First Output', isCorrect: false }, { text: 'Least Important First Out', isCorrect: false }], hint: 'Think of a stack of plates.', explanation: 'LIFO means Last In, First Out. The most recently added element is removed first, like plates stacked on top of each other.' },
  { subject: 'Data Structures', difficulty: 'Easy', question: 'Which of the following is a linear data structure?', options: [{ text: 'Tree', isCorrect: false }, { text: 'Graph', isCorrect: false }, { text: 'Linked List', isCorrect: true }, { text: 'Heap', isCorrect: false }], hint: 'Linear means elements are arranged sequentially.', explanation: 'A Linked List is linear — each node points to the next in a sequential chain. Trees and Graphs are non-linear.' },
  // Medium
  { subject: 'Data Structures', difficulty: 'Medium', question: 'What is the worst-case time complexity of searching in a Binary Search Tree?', options: [{ text: 'O(log n)', isCorrect: false }, { text: 'O(n)', isCorrect: true }, { text: 'O(1)', isCorrect: false }, { text: 'O(n log n)', isCorrect: false }], hint: 'Consider a skewed tree.', explanation: 'In the worst case (skewed tree where all nodes are on one side), BST search degrades to O(n) as it becomes essentially a linked list.' },
  { subject: 'Data Structures', difficulty: 'Medium', question: 'Which traversal of a BST gives elements in sorted order?', options: [{ text: 'Preorder', isCorrect: false }, { text: 'Postorder', isCorrect: false }, { text: 'Inorder', isCorrect: true }, { text: 'Level order', isCorrect: false }], hint: 'Left-Root-Right order.', explanation: 'Inorder traversal (Left → Root → Right) of a BST visits nodes in ascending sorted order.' },
  { subject: 'Data Structures', difficulty: 'Medium', question: 'What is the space complexity of a hash table with n elements?', options: [{ text: 'O(1)', isCorrect: false }, { text: 'O(n)', isCorrect: true }, { text: 'O(log n)', isCorrect: false }, { text: 'O(n²)', isCorrect: false }], hint: 'Each element needs storage space.', explanation: 'A hash table needs O(n) space to store n elements, plus some overhead for the underlying array and handling collisions.' },
  // Hard
  { subject: 'Data Structures', difficulty: 'Hard', question: 'What is the amortized time complexity of insertion in a dynamic array (ArrayList)?', options: [{ text: 'O(n)', isCorrect: false }, { text: 'O(1)', isCorrect: true }, { text: 'O(log n)', isCorrect: false }, { text: 'O(n log n)', isCorrect: false }], hint: 'Most insertions are O(1), with occasional O(n) resizing.', explanation: 'While individual insertions can be O(n) during resizing, the amortized cost over many operations is O(1) because resizing doubles capacity, making expensive operations rare.' },
  { subject: 'Data Structures', difficulty: 'Hard', question: 'In a Red-Black Tree, what is the maximum height for n nodes?', options: [{ text: 'log n', isCorrect: false }, { text: '2 log(n+1)', isCorrect: true }, { text: 'n/2', isCorrect: false }, { text: 'n', isCorrect: false }], hint: 'Red-Black trees guarantee balanced height.', explanation: 'A Red-Black tree guarantees height ≤ 2·log₂(n+1), ensuring O(log n) operations. This is proven by the properties that ensure no path is more than twice as long as any other.' },
  { subject: 'Data Structures', difficulty: 'Hard', question: 'Which data structure is most efficient for implementing a priority queue?', options: [{ text: 'Sorted Array', isCorrect: false }, { text: 'Binary Heap', isCorrect: true }, { text: 'Linked List', isCorrect: false }, { text: 'Stack', isCorrect: false }], hint: 'Think about O(log n) insert and extract-min.', explanation: 'A Binary Heap provides O(log n) insertion and O(log n) extract-min/max, making it the most efficient choice for priority queues. Sorted arrays have O(n) insertion.' },

  // === MATHEMATICS (10 questions) ===
  { subject: 'Mathematics', difficulty: 'Easy', question: 'What is the derivative of x²?', options: [{ text: 'x', isCorrect: false }, { text: '2x', isCorrect: true }, { text: '2', isCorrect: false }, { text: 'x³/3', isCorrect: false }], hint: 'Use the power rule: d/dx(xⁿ) = nxⁿ⁻¹.', explanation: 'Using the power rule, d/dx(x²) = 2x²⁻¹ = 2x. The power rule states that the derivative of xⁿ is n·xⁿ⁻¹.' },
  { subject: 'Mathematics', difficulty: 'Easy', question: 'What is the value of sin(90°)?', options: [{ text: '0', isCorrect: false }, { text: '1', isCorrect: true }, { text: '-1', isCorrect: false }, { text: '0.5', isCorrect: false }], hint: 'Think of the unit circle at the top.', explanation: 'On the unit circle, sin(90°) = sin(π/2) = 1. At 90°, the y-coordinate reaches its maximum value of 1.' },
  { subject: 'Mathematics', difficulty: 'Easy', question: 'What is the integral of 1/x dx?', options: [{ text: 'x²', isCorrect: false }, { text: 'ln|x| + C', isCorrect: true }, { text: '1/x² + C', isCorrect: false }, { text: 'e^x + C', isCorrect: false }], hint: 'This is a special case integral.', explanation: 'The integral of 1/x is ln|x| + C. This is because d/dx(ln|x|) = 1/x.' },
  { subject: 'Mathematics', difficulty: 'Medium', question: 'What is the determinant of a 2×2 matrix [[a,b],[c,d]]?', options: [{ text: 'ad + bc', isCorrect: false }, { text: 'ad - bc', isCorrect: true }, { text: 'ac - bd', isCorrect: false }, { text: 'ab - cd', isCorrect: false }], hint: 'Multiply diagonals and subtract.', explanation: 'The determinant of [[a,b],[c,d]] = ad - bc. Multiply main diagonal (ad) minus anti-diagonal (bc).' },
  { subject: 'Mathematics', difficulty: 'Medium', question: 'What is the sum of the infinite geometric series 1 + 1/2 + 1/4 + 1/8 + ...?', options: [{ text: '1', isCorrect: false }, { text: '2', isCorrect: true }, { text: '3', isCorrect: false }, { text: 'Infinity', isCorrect: false }], hint: 'Use S = a/(1-r) where |r| < 1.', explanation: 'Using S = a/(1-r) with a=1 and r=1/2: S = 1/(1-0.5) = 1/0.5 = 2.' },
  { subject: 'Mathematics', difficulty: 'Medium', question: 'What is the Euler number e approximately equal to?', options: [{ text: '2.718', isCorrect: true }, { text: '3.142', isCorrect: false }, { text: '1.618', isCorrect: false }, { text: '2.236', isCorrect: false }], hint: 'It is the base of natural logarithm.', explanation: 'Euler\'s number e ≈ 2.71828... It is the base of the natural logarithm and appears in compound interest, calculus, and probability.' },
  { subject: 'Mathematics', difficulty: 'Hard', question: 'What is the Laplace transform of e^(at)?', options: [{ text: '1/(s+a)', isCorrect: false }, { text: '1/(s-a)', isCorrect: true }, { text: 's/(s²+a²)', isCorrect: false }, { text: 'a/(s²-a²)', isCorrect: false }], hint: 'Apply the definition integral from 0 to ∞.', explanation: 'L{e^(at)} = ∫₀^∞ e^(at)·e^(-st) dt = ∫₀^∞ e^(-(s-a)t) dt = 1/(s-a) for s > a.' },
  { subject: 'Mathematics', difficulty: 'Hard', question: 'How many ways can 5 people sit around a circular table?', options: [{ text: '120', isCorrect: false }, { text: '24', isCorrect: true }, { text: '60', isCorrect: false }, { text: '5', isCorrect: false }], hint: 'Circular permutations = (n-1)!', explanation: 'Circular permutations of n objects = (n-1)! = 4! = 24. We fix one person and arrange the remaining 4.' },
  { subject: 'Mathematics', difficulty: 'Hard', question: 'What is the eigenvalue equation for a matrix A?', options: [{ text: 'Ax = λx', isCorrect: true }, { text: 'Ax = x/λ', isCorrect: false }, { text: 'A + λI = 0', isCorrect: false }, { text: 'det(A) = λ', isCorrect: false }], hint: 'The vector x does not change direction.', explanation: 'Eigenvalue equation: Ax = λx, where λ is the eigenvalue and x is the eigenvector. The matrix A scales x by factor λ without changing its direction.' },
  { subject: 'Mathematics', difficulty: 'Easy', question: 'What is 7! (7 factorial)?', options: [{ text: '720', isCorrect: false }, { text: '5040', isCorrect: true }, { text: '40320', isCorrect: false }, { text: '362880', isCorrect: false }], hint: '7! = 7 × 6 × 5 × 4 × 3 × 2 × 1', explanation: '7! = 7×6×5×4×3×2×1 = 5040. Factorial means multiplying all positive integers up to that number.' },


];

const seedQuestions = async () => {
  try {
    await connectDB();
    
    // Find teacher
    const teacher = await mongoose.connection.collection('teachers').findOne({ email: 'teacher@test.com' });
    if (!teacher) {
      ('❌ Teacher not found. Run seed.js first.');
      process.exit(1);
    }

    // Find or create a course for questions
    let course = await mongoose.connection.collection('courses').findOne({ courseCode: 'CS101' });
    if (!course) {
      const result = await mongoose.connection.collection('courses').insertOne({
        courseCode: 'CS101',
        name: 'Computer Science Fundamentals',
        description: 'Core CS concepts including data structures, algorithms, and programming',
        teacher: teacher._id,
        credits: 4,
        semester: 'Spring',
        year: 2026,
        maxStudents: 50,
        enrolledStudents: [],
        isActive: true,
        status: 'published',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      course = { _id: result.insertedId };
      ('✅ Created course CS101');
    }

    // Enroll student in the course
    const student = await mongoose.connection.collection('students').findOne({ email: 'student@test.com' });
    if (student) {
      await mongoose.connection.collection('courses').updateOne(
        { _id: course._id },
        { $addToSet: { enrolledStudents: student._id } }
      );
      await mongoose.connection.collection('students').updateOne(
        { _id: student._id },
        { $addToSet: { enrolledCourses: course._id } }
      );
      ('✅ Student enrolled in CS101');
    }

    // Clear existing questions
    await mongoose.connection.collection('questions').deleteMany({});
    ('🗑️  Cleared existing questions');

    // Insert questions
    const docs = questions.map(q => ({
      ...q,
      course: course._id,
      teacher: teacher._id,
      type: 'multiple-choice',
      idealAnswer: '',
      marks: 10,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    await mongoose.connection.collection('questions').insertMany(docs);
    (`✅ Seeded ${docs.length} MCQ questions`);
    (`   - Data Structures: ${docs.filter(d => d.subject === 'Data Structures').length}`);
    (`   - Mathematics: ${docs.filter(d => d.subject === 'Mathematics').length}`);
    // (`   - Physics: ${docs.filter(d => d.subject === 'Physics').length}`);

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedQuestions();
