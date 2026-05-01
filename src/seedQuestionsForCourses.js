/**
 * Seed Questions for Existing Courses
 * Drops existing questions and creates new ones linked to courses in the database
 */
require('dotenv').config();
const mongoose = require('mongoose');

const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  ('MongoDB Connected');
};

const questionTemplates = {
  'Data Structures': [
    { difficulty: 'Easy', question: 'What is the time complexity of accessing an element in an array by index?', options: [{ text: 'O(1)', isCorrect: true }, { text: 'O(n)', isCorrect: false }, { text: 'O(log n)', isCorrect: false }, { text: 'O(n²)', isCorrect: false }], hint: 'Arrays provide direct access via memory offset.', explanation: 'Arrays store elements in contiguous memory, so accessing any element by index is a constant-time O(1) operation.' },
    { difficulty: 'Easy', question: 'Which data structure follows the FIFO (First In, First Out) principle?', options: [{ text: 'Stack', isCorrect: false }, { text: 'Queue', isCorrect: true }, { text: 'Tree', isCorrect: false }, { text: 'Graph', isCorrect: false }], hint: 'Think of a line of people waiting.', explanation: 'A Queue follows FIFO — the first element added is the first one removed.' },
    { difficulty: 'Easy', question: 'What does LIFO stand for in the context of stacks?', options: [{ text: 'Last In First Out', isCorrect: true }, { text: 'Last In Final Order', isCorrect: false }, { text: 'Linear Input First Output', isCorrect: false }, { text: 'Least Important First Out', isCorrect: false }], hint: 'Think of a stack of plates.', explanation: 'LIFO means Last In, First Out. The most recently added element is removed first.' },
    { difficulty: 'Easy', question: 'Which of the following is a linear data structure?', options: [{ text: 'Tree', isCorrect: false }, { text: 'Graph', isCorrect: false }, { text: 'Linked List', isCorrect: true }, { text: 'Heap', isCorrect: false }], hint: 'Linear means elements are arranged sequentially.', explanation: 'A Linked List is linear — each node points to the next in a sequential chain.' },
    { difficulty: 'Medium', question: 'What is the worst-case time complexity of searching in a Binary Search Tree?', options: [{ text: 'O(log n)', isCorrect: false }, { text: 'O(n)', isCorrect: true }, { text: 'O(1)', isCorrect: false }, { text: 'O(n log n)', isCorrect: false }], hint: 'Consider a skewed tree.', explanation: 'In worst case (skewed tree), BST search degrades to O(n).' },
    { difficulty: 'Medium', question: 'Which traversal of a BST gives elements in sorted order?', options: [{ text: 'Preorder', isCorrect: false }, { text: 'Postorder', isCorrect: false }, { text: 'Inorder', isCorrect: true }, { text: 'Level order', isCorrect: false }], hint: 'Left-Root-Right order.', explanation: 'Inorder traversal visits nodes in ascending sorted order.' },
    { difficulty: 'Medium', question: 'What is the space complexity of a hash table with n elements?', options: [{ text: 'O(1)', isCorrect: false }, { text: 'O(n)', isCorrect: true }, { text: 'O(log n)', isCorrect: false }, { text: 'O(n²)', isCorrect: false }], hint: 'Each element needs storage space.', explanation: 'A hash table needs O(n) space to store n elements.' },
    { difficulty: 'Hard', question: 'What is the amortized time complexity of insertion in a dynamic array (ArrayList)?', options: [{ text: 'O(n)', isCorrect: false }, { text: 'O(1)', isCorrect: true }, { text: 'O(log n)', isCorrect: false }, { text: 'O(n log n)', isCorrect: false }], hint: 'Most insertions are O(1), with occasional O(n) resizing.', explanation: 'The amortized cost over many operations is O(1) because resizing doubles capacity.' },
    { difficulty: 'Hard', question: 'In a Red-Black Tree, what is the maximum height for n nodes?', options: [{ text: 'log n', isCorrect: false }, { text: '2 log(n+1)', isCorrect: true }, { text: 'n/2', isCorrect: false }, { text: 'n', isCorrect: false }], hint: 'Red-Black trees guarantee balanced height.', explanation: 'A Red-Black tree guarantees height ≤ 2·log₂(n+1).' },
    { difficulty: 'Hard', question: 'Which data structure is most efficient for implementing a priority queue?', options: [{ text: 'Sorted Array', isCorrect: false }, { text: 'Binary Heap', isCorrect: true }, { text: 'Linked List', isCorrect: false }, { text: 'Stack', isCorrect: false }], hint: 'Think about O(log n) insert and extract-min.', explanation: 'A Binary Heap provides O(log n) insertion and extraction.' },
  ],
  'Database Systems': [
    { difficulty: 'Easy', question: 'What does SQL stand for?', options: [{ text: 'Structured Query Language', isCorrect: true }, { text: 'Simple Query Language', isCorrect: false }, { text: 'Standard Query Language', isCorrect: false }, { text: 'System Query Language', isCorrect: false }], hint: 'It is used to manage relational databases.', explanation: 'SQL is the standard language for managing relational databases.' },
    { difficulty: 'Easy', question: 'Which SQL command is used to retrieve data?', options: [{ text: 'INSERT', isCorrect: false }, { text: 'SELECT', isCorrect: true }, { text: 'UPDATE', isCorrect: false }, { text: 'DELETE', isCorrect: false }], hint: 'Think about reading data from a table.', explanation: 'SELECT is used to query and retrieve data from a database.' },
    { difficulty: 'Easy', question: 'What is a primary key?', options: [{ text: 'A unique identifier for each record', isCorrect: true }, { text: 'The first column in a table', isCorrect: false }, { text: 'A foreign key reference', isCorrect: false }, { text: 'An index for fast queries', isCorrect: false }], hint: 'It must be unique and not null.', explanation: 'A primary key uniquely identifies each row in a table.' },
    { difficulty: 'Easy', question: 'What is a foreign key?', options: [{ text: 'A key used for encryption', isCorrect: false }, { text: 'A key that references another table', isCorrect: true }, { text: 'The main key in a table', isCorrect: false }, { text: 'A duplicate of primary key', isCorrect: false }], hint: 'It creates a relationship between tables.', explanation: 'A foreign key references the primary key of another table.' },
    { difficulty: 'Medium', question: 'What is normalization in databases?', options: [{ text: 'Converting data to JSON format', isCorrect: false }, { text: 'Organizing data to reduce redundancy', isCorrect: true }, { text: 'Encrypting sensitive data', isCorrect: false }, { text: 'Creating backup copies', isCorrect: false }], hint: 'It helps avoid data duplication.', explanation: 'Normalization organizes data into tables to minimize redundancy.' },
    { difficulty: 'Medium', question: 'What is a JOIN operation?', options: [{ text: 'Combining two tables into one', isCorrect: false }, { text: 'Combining rows from two tables based on related columns', isCorrect: true }, { text: 'Deleting duplicate records', isCorrect: false }, { text: 'Creating a new table', isCorrect: false }], hint: 'It relates data from multiple tables.', explanation: 'JOIN combines rows from two tables based on a related column.' },
    { difficulty: 'Medium', question: 'What is the difference between INNER JOIN and LEFT JOIN?', options: [{ text: 'INNER JOIN returns unmatched rows too', isCorrect: false }, { text: 'LEFT JOIN returns all rows from left table, INNER returns only matches', isCorrect: true }, { text: 'They are the same', isCorrect: false }, { text: 'LEFT JOIN is faster', isCorrect: false }], hint: 'Think about which table is the "left" table.', explanation: 'LEFT JOIN returns all rows from the left table and matched rows from the right.' },
    { difficulty: 'Hard', question: 'What is a transaction in databases?', options: [{ text: 'A single SQL query', isCorrect: false }, { text: 'A sequence of operations treated as a single unit', isCorrect: true }, { text: 'A type of index', isCorrect: false }, { text: 'A database backup', isCorrect: false }], hint: 'ACID properties apply here.', explanation: 'A transaction is a sequence of operations that either all succeed or all fail.' },
    { difficulty: 'Hard', question: 'What does ACID stand for in database transactions?', options: [{ text: 'Atomic, Consistent, Isolated, Durable', isCorrect: true }, { text: 'Advanced, Consistent, Indexed, Distributed', isCorrect: false }, { text: 'Atomic, Complete, Isolated, Dynamic', isCorrect: false }, { text: 'Automated, Concurrent, Independent, Durable', isCorrect: false }], hint: 'These are properties of database transactions.', explanation: 'ACID ensures reliable transaction processing in databases.' },
    { difficulty: 'Hard', question: 'What is database indexing?', options: [{ text: 'A way to encrypt the entire database', isCorrect: false }, { text: 'A data structure that improves query speed', isCorrect: true }, { text: 'A method to compress data', isCorrect: false }, { text: 'A backup strategy', isCorrect: false }], hint: 'Think of a book index.', explanation: 'An index helps find data quickly without scanning the entire table.' },
  ],
  'Linear Algebra': [
    { difficulty: 'Easy', question: 'What is the determinant of a 2×2 matrix [[a,b],[c,d]]?', options: [{ text: 'ad + bc', isCorrect: false }, { text: 'ad - bc', isCorrect: true }, { text: 'ac - bd', isCorrect: false }, { text: 'ab - cd', isCorrect: false }], hint: 'Multiply diagonals and subtract.', explanation: 'The determinant = ad - bc.' },
    { difficulty: 'Easy', question: 'What is the transpose of a matrix?', options: [{ text: 'Swapping rows and columns', isCorrect: true }, { text: 'Multiplying by itself', isCorrect: false }, { text: 'Taking the inverse', isCorrect: false }, { text: 'Finding the determinant', isCorrect: false }], hint: 'Row becomes column, column becomes row.', explanation: 'The transpose of a matrix A, denoted A^T, is obtained by swapping rows and columns.' },
    { difficulty: 'Easy', question: 'What is a scalar in linear algebra?', options: [{ text: 'A single number (not a vector)', isCorrect: true }, { text: 'A type of matrix', isCorrect: false }, { text: 'A vector with magnitude 1', isCorrect: false }, { text: 'An equation', isCorrect: false }], hint: 'It is just a regular number.', explanation: 'A scalar is a single number, as opposed to a vector or matrix.' },
    { difficulty: 'Easy', question: 'What is the identity matrix?', options: [{ text: 'A matrix with all zeros', isCorrect: false }, { text: 'A square matrix with 1s on diagonal and 0s elsewhere', isCorrect: true }, { text: 'A matrix with all ones', isCorrect: false }, { text: 'A diagonal matrix', isCorrect: false }], hint: 'It acts like 1 in multiplication.', explanation: 'The identity matrix I has 1s on the main diagonal and 0s elsewhere.' },
    { difficulty: 'Medium', question: 'What is the eigenvalue equation for a matrix A?', options: [{ text: 'Ax = λx', isCorrect: true }, { text: 'Ax = x/λ', isCorrect: false }, { text: 'A + λI = 0', isCorrect: false }, { text: 'det(A) = λ', isCorrect: false }], hint: 'The vector x does not change direction.', explanation: 'Eigenvalue equation: Ax = λx, where λ is eigenvalue and x is eigenvector.' },
    { difficulty: 'Medium', question: 'What is the rank of a matrix?', options: [{ text: 'The number of rows', isCorrect: false }, { text: 'The maximum number of linearly independent rows/columns', isCorrect: true }, { text: 'The determinant value', isCorrect: false }, { text: 'The number of columns', isCorrect: false }], hint: 'It measures the dimension of the column space.', explanation: 'Rank tells us the number of linearly independent rows or columns.' },
    { difficulty: 'Medium', question: 'When is a matrix invertible?', options: [{ text: 'When its determinant is zero', isCorrect: false }, { text: 'When its determinant is non-zero', isCorrect: true }, { text: 'When it is symmetric', isCorrect: false }, { text: 'When it has more rows than columns', isCorrect: false }], hint: 'Think about the determinant.', explanation: 'A matrix is invertible (non-singular) iff its determinant ≠ 0.' },
    { difficulty: 'Hard', question: 'What is the Singular Value Decomposition (SVD) of a matrix?', options: [{ text: 'A = UΣV^T where U and V are orthogonal, Σ is diagonal', isCorrect: true }, { text: 'A = LU decomposition', isCorrect: false }, { text: 'A = QR decomposition', isCorrect: false }, { text: 'A = PDP^-1', isCorrect: false }], hint: 'It factors a matrix into three components.', explanation: 'SVD decomposes a matrix into orthogonal matrices and a diagonal matrix.' },
    { difficulty: 'Hard', question: 'What is the dimension of the null space of a matrix?', options: [{ text: 'Number of columns', isCorrect: false }, { text: 'nullity = n - rank', isCorrect: true }, { text: 'Rank of the matrix', isCorrect: false }, { text: 'Number of rows', isCorrect: false }], hint: 'Use the Rank-Nullity Theorem.', explanation: 'By Rank-Nullity Theorem, nullity = n - rank.' },
    { difficulty: 'Hard', question: 'What is a orthogonal matrix?', options: [{ text: 'A matrix where A^T = A', isCorrect: false }, { text: 'A matrix where A^T = A^-1', isCorrect: true }, { text: 'A matrix with all positive entries', isCorrect: false }, { text: 'A diagonal matrix', isCorrect: false }], hint: 'Its inverse equals its transpose.', explanation: 'An orthogonal matrix Q satisfies Q^TQ = I, so Q^T = Q^-1.' },
  ],
  'Web Development': [
    { difficulty: 'Easy', question: 'What does HTML stand for?', options: [{ text: 'Hyper Text Markup Language', isCorrect: true }, { text: 'High Tech Modern Language', isCorrect: false }, { text: 'Hyper Transfer Markup Language', isCorrect: false }, { text: 'Home Tool Markup Language', isCorrect: false }], hint: 'It is the standard markup language for web pages.', explanation: 'HTML is the standard markup language for creating web pages.' },
    { difficulty: 'Easy', question: 'What does CSS stand for?', options: [{ text: 'Computer Style Sheets', isCorrect: false }, { text: 'Cascading Style Sheets', isCorrect: true }, { text: 'Creative Style System', isCorrect: false }, { text: 'Colorful Style Sheets', isCorrect: false }], hint: 'It controls the visual presentation of web pages.', explanation: 'CSS defines how HTML elements are displayed.' },
    { difficulty: 'Easy', question: 'Which tag is used for the largest heading in HTML?', options: [{ text: '<heading>', isCorrect: false }, { text: '<h6>', isCorrect: false }, { text: '<h1>', isCorrect: true }, { text: '<head>', isCorrect: false }], hint: 'There are 6 heading levels.', explanation: '<h1> is the largest heading tag in HTML.' },
    { difficulty: 'Easy', question: 'What is JavaScript primarily used for?', options: [{ text: 'Styling web pages', isCorrect: false }, { text: 'Adding interactivity to web pages', isCorrect: true }, { text: 'Defining page structure', isCorrect: false }, { text: 'Creating databases', isCorrect: false }], hint: 'It runs in the browser.', explanation: 'JavaScript adds dynamic behavior and interactivity to web pages.' },
    { difficulty: 'Medium', question: 'What is the DOM in web development?', options: [{ text: 'A database system', isCorrect: false }, { text: 'A programming language', isCorrect: false }, { text: 'A programming interface for HTML/XML documents', isCorrect: true }, { text: 'A CSS framework', isCorrect: false }], hint: 'It represents the page structure as objects.', explanation: 'DOM (Document Object Model) represents the page as objects that can be manipulated.' },
    { difficulty: 'Medium', question: 'What is the difference between let and const in JavaScript?', options: [{ text: 'They are the same', isCorrect: false }, { text: 'let can be reassigned, const cannot', isCorrect: true }, { text: 'const is faster', isCorrect: false }, { text: 'let is for constants', isCorrect: false }], hint: 'Think about reassignment.', explanation: 'let allows reassignment, const creates a read-only reference.' },
    { difficulty: 'Medium', question: 'What is a REST API?', options: [{ text: 'A programming language', isCorrect: false }, { text: 'An architectural style for web services', isCorrect: true }, { text: 'A database', isCorrect: false }, { text: 'A CSS framework', isCorrect: false }], hint: 'It uses HTTP methods to interact with resources.', explanation: 'REST (Representational State Transfer) is an architectural style for APIs.' },
    { difficulty: 'Hard', question: 'What is the purpose of React hooks?', options: [{ text: 'To add styles to components', isCorrect: false }, { text: 'To use state and lifecycle features in functional components', isCorrect: true }, { text: 'To connect to databases', isCorrect: false }, { text: 'To create HTML elements', isCorrect: false }], hint: 'They let functional components have state.', explanation: 'Hooks like useState and useEffect add state and side effects to functional components.' },
    { difficulty: 'Hard', question: 'What is the virtual DOM in React?', options: [{ text: 'A copy of the real DOM in memory', isCorrect: true }, { text: 'A browser extension', isCorrect: false }, { text: 'A CSS library', isCorrect: false }, { text: 'A database', isCorrect: false }], hint: 'React uses it for efficient updates.', explanation: 'Virtual DOM is a lightweight copy of the real DOM that React uses to minimize actual DOM manipulations.' },
    { difficulty: 'Hard', question: 'What is CORS in web development?', options: [{ text: 'A JavaScript framework', isCorrect: false }, { text: 'A security mechanism that allows cross-origin requests', isCorrect: true }, { text: 'A CSS preprocessor', isCorrect: false }, { text: 'A database system', isCorrect: false }], hint: 'It controls access between different domains.', explanation: 'CORS (Cross-Origin Resource Sharing) allows controlled access to resources from different origins.' },
  ],
  'Machine Learning': [
    { difficulty: 'Easy', question: 'What is supervised learning?', options: [{ text: 'Learning without any data', isCorrect: false }, { text: 'Learning from labeled data', isCorrect: true }, { text: 'Learning by trial and error', isCorrect: false }, { text: 'Learning without a model', isCorrect: false }], hint: 'It uses training data with answers.', explanation: 'Supervised learning trains on labeled data where the correct output is known.' },
    { difficulty: 'Easy', question: 'What is overfitting in machine learning?', options: [{ text: 'When a model performs well on both training and test data', isCorrect: false }, { text: 'When a model learns training data too well but fails on new data', isCorrect: true }, { text: 'When a model is too simple', isCorrect: false }, { text: 'When there is not enough data', isCorrect: false }], hint: 'The model memorizes rather than generalizes.', explanation: 'Overfitting occurs when a model learns noise in training data, failing to generalize.' },
    { difficulty: 'Easy', question: 'What is a neural network?', options: [{ text: 'A linear regression model', isCorrect: false }, { text: 'A model inspired by the human brain with interconnected nodes', isCorrect: true }, { text: 'A decision tree', isCorrect: false }, { text: 'A clustering algorithm', isCorrect: false }], hint: 'It has layers of interconnected nodes.', explanation: 'Neural networks consist of layers of nodes (neurons) that process information.' },
    { difficulty: 'Easy', question: 'What is the purpose of a loss function?', options: [{ text: 'To speed up training', isCorrect: false }, { text: 'To measure how well the model is performing', isCorrect: true }, { text: 'To prevent overfitting', isCorrect: false }, { text: 'To initialize weights', isCorrect: false }], hint: 'Lower is better.', explanation: 'A loss function quantifies how far predictions are from actual values.' },
    { difficulty: 'Medium', question: 'What is the difference between classification and regression?', options: [{ text: 'They are the same', isCorrect: false }, { text: 'Classification predicts categories, regression predicts continuous values', isCorrect: true }, { text: 'Classification is unsupervised', isCorrect: false }, { text: 'Regression is for classification', isCorrect: false }], hint: 'Think discrete vs continuous.', explanation: 'Classification predicts discrete labels, regression predicts continuous numbers.' },
    { difficulty: 'Medium', question: 'What is gradient descent?', options: [{ text: 'A type of neural network', isCorrect: false }, { text: 'An optimization algorithm to minimize the loss function', isCorrect: true }, { text: 'A way to split data', isCorrect: false }, { text: 'A metric for accuracy', isCorrect: false }], hint: 'It finds the minimum of the loss function.', explanation: 'Gradient descent iteratively updates parameters to minimize the loss function.' },
    { difficulty: 'Medium', question: 'What is the purpose of regularization?', options: [{ text: 'To increase model complexity', isCorrect: false }, { text: 'To prevent overfitting by penalizing large weights', isCorrect: true }, { text: 'To speed up training', isCorrect: false }, { text: 'To initialize weights', isCorrect: false }], hint: 'It helps generalization.', explanation: 'Regularization (L1/L2) adds penalties to prevent overfitting.' },
    { difficulty: 'Hard', question: 'What is backpropagation?', options: [{ text: 'A way to preprocess data', isCorrect: false }, { text: 'An algorithm to train neural networks by computing gradients', isCorrect: true }, { text: 'A type of activation function', isCorrect: false }, { text: 'A method for feature selection', isCorrect: false }], hint: 'It goes backwards through the network.', explanation: 'Backpropagation computes gradients of loss with respect to weights.' },
    { difficulty: 'Hard', question: 'What is the bias-variance tradeoff?', options: [{ text: 'Balancing between training and test accuracy', isCorrect: false }, { text: 'Balancing between underfitting and overfitting', isCorrect: true }, { text: 'Choosing between bias and variance algorithms', isCorrect: false }, { text: 'A type of regularization', isCorrect: false }], hint: 'High bias leads to underfitting, high variance to overfitting.', explanation: 'The tradeoff describes the balance between model complexity that underfits (high bias) or overfits (high variance).' },
    { difficulty: 'Hard', question: 'What is transfer learning?', options: [{ text: 'Learning a new task from scratch', isCorrect: false }, { text: 'Using knowledge from one task to improve performance on another', isCorrect: true }, { text: 'Moving data between databases', isCorrect: false }, { text: 'A type of neural network architecture', isCorrect: false }], hint: 'It leverages pre-trained models.', explanation: 'Transfer learning applies knowledge from a trained model to a new related task.' },
  ],
};

const seedQuestions = async () => {
  try {
    await connectDB();
    
    // Get all active courses
    const courses = await mongoose.connection.collection('courses').find({ isActive: true }).toArray();
    
    if (courses.length === 0) {
      ('❌ No courses found in database. Please create courses first.');
      process.exit(1);
    }
    
    (`Found ${courses.length} courses in database:`);
    courses.forEach(c => (`  - ${c.name} (${c.courseCode})`));
    
    // Get a teacher for the questions
    const teacher = await mongoose.connection.collection('teachers').findOne();
    if (!teacher) {
      ('❌ No teacher found in database.');
      process.exit(1);
    }
    
    // Drop all existing questions
    await mongoose.connection.collection('questions').deleteMany({});
    ('🗑️  Dropped all existing questions');
    
    // Create questions for each course
    let totalQuestions = 0;
    
    for (const course of courses) {
      const courseName = course.name;
      const templates = questionTemplates[courseName];
      
      if (!templates) {
        (`⚠️  No question templates found for course: ${courseName}`);
        
        // Create generic questions for unknown courses
        const genericQuestions = [
          { difficulty: 'Easy', question: `What is the main concept of ${courseName}?`, options: [{ text: 'A fundamental concept', isCorrect: true }, { text: 'Something else', isCorrect: false }, { text: 'Not related', isCorrect: false }, { text: 'Unknown', isCorrect: false }], hint: 'Think about the basics.', explanation: 'This is a foundational concept in the course.' },
          { difficulty: 'Medium', question: `Which of the following is related to ${courseName}?`, options: [{ text: 'Core topic 1', isCorrect: true }, { text: 'Unrelated topic', isCorrect: false }, { text: 'Different subject', isCorrect: false }, { text: 'Nothing', isCorrect: false }], hint: 'Consider the course content.', explanation: 'This is a key topic in the course.' },
          { difficulty: 'Hard', question: `How would you apply ${courseName} concepts in real-world scenarios?`, options: [{ text: 'Through practical implementation', isCorrect: true }, { text: 'By ignoring it', isCorrect: false }, { text: 'It cannot be applied', isCorrect: false }, { text: 'Only in theory', isCorrect: false }], hint: 'Think about practical applications.', explanation: 'The concepts can be applied in various real-world scenarios.' },
        ];
        
        const docs = genericQuestions.map(q => ({
          ...q,
          subject: courseName,
          type: 'multiple-choice',
          course: course._id,
          teacher: teacher._id,
          idealAnswer: '',
          marks: 10,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }));
        
        await mongoose.connection.collection('questions').insertMany(docs);
        totalQuestions += docs.length;
        (`✅ Added ${docs.length} generic questions for ${courseName}`);
      } else {
        const docs = templates.map(q => ({
          ...q,
          subject: courseName,
          type: 'multiple-choice',
          course: course._id,
          teacher: teacher._id,
          idealAnswer: '',
          marks: 10,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }));
        
        await mongoose.connection.collection('questions').insertMany(docs);
        totalQuestions += docs.length;
        (`✅ Added ${docs.length} questions for ${courseName}`);
      }
    }
    
    (`\n🎉 Total questions seeded: ${totalQuestions}`);
    
    // Verify
    const count = await mongoose.connection.collection('questions').countDocuments();
    (`📊 Total questions in database: ${count}`);
    
    // Show breakdown by course
    ('\n📋 Questions by course:');
    for (const course of courses) {
      const c = await mongoose.connection.collection('questions').countDocuments({ course: course._id });
      (`  - ${course.name}: ${c} questions`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedQuestions();
