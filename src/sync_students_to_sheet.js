require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const { Student } = require('./models');
const { appendMultipleToSheet } = require('./utils/googleSheets');

const syncStudentsToSheet = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/student-management';
    await mongoose.connect(mongoUri);
    ('Connected to MongoDB');

    const students = await Student.find({});
    (`Found ${students.length} students to sync`);

    if (students.length > 0) {
      const rows = students.map(student => [
        `${student.firstName} ${student.lastName}`,
        student.email,
        student.studentId,
        student.major || 'Computer Science',
        student.gpa ? student.gpa.toString() : '0',
        '1', // Fallback semester
        student.createdAt ? new Date(student.createdAt).toISOString() : new Date().toISOString(),
        '[Hidden/Hashed in DB]' // We don't have the plain text password
      ]);

      await appendMultipleToSheet(rows);
      ('Sync complete');
    }

  } catch (error) {
    console.error('Sync failed:', error);
  } finally {
    await mongoose.disconnect();
    ('Disconnected from MongoDB');
    process.exit(0);
  }
};

syncStudentsToSheet();
