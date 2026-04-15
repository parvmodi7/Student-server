/**
 * Database Seeder
 * Create initial student and teacher for testing
 */
require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB Connected');
};

const seed = async () => {
  try {
    await connectDB();

    // Check if users exist
    const existingStudent = await mongoose.connection.collection('users').findOne({ email: 'student@test.com' });
    const existingTeacher = await mongoose.connection.collection('users').findOne({ email: 'teacher@test.com' });

    if (existingStudent) {
      console.log('Student already exists');
    } else {
      // Create Student User
      const studentUser = await mongoose.connection.collection('users').insertOne({
        email: 'student@test.com',
        password: await bcrypt.hash('password123', 12),
        role: 'student',
        firstName: 'Alex',
        lastName: 'Johnson',
        avatar: '',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Create Student Profile
      await mongoose.connection.collection('students').insertOne({
        userId: studentUser.insertedId,
        studentId: 'STU-2024-001',
        enrolledCourses: [],
        major: 'Computer Science',
        graduationYear: 2026,
        gpa: 3.42,
        totalCredits: 45,
        notifications: []
      });

      console.log('Student created: student@test.com / password123');
    }

    if (existingTeacher) {
      console.log('Teacher already exists');
    } else {
      // Create Teacher User
      const teacherUser = await mongoose.connection.collection('users').insertOne({
        email: 'teacher@test.com',
        password: await bcrypt.hash('password123', 12),
        role: 'teacher',
        firstName: 'Dr. Sarah',
        lastName: 'Mitchell',
        avatar: '',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Create Teacher Profile
      await mongoose.connection.collection('teachers').insertOne({
        userId: teacherUser.insertedId,
        employeeId: 'TCH-2024-001',
        department: 'Computer Science',
        designation: 'professor',
        coursesTaught: []
      });

      console.log('Teacher created: teacher@test.com / password123');
    }

    console.log('\n✅ Seed completed!');
    console.log('\nLogin Credentials:');
    console.log('Student: student@test.com / password123');
    console.log('Teacher: teacher@test.com / password123');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seed();