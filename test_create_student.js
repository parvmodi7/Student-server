require('dotenv').config();
const mongoose = require('mongoose');
const { Student } = require('./src/models');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/student-management');
  try {
    const student = new Student({
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: '',
      studentId: 'STU-12345',
    });
    await student.validate();
    console.log("Validation passed");
  } catch (err) {
    console.log("Validation error:", err.message);
  }
  process.exit(0);
}
run();
