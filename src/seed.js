/**
 * Database Seeder
 * Create initial student and teacher records
 * 
 * Database structure:
 * - students collection: email, password, name, studentId, major, gpa, etc.
 * - teachers collection: email, password, name, employeeId, department
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

    // Create Student record (includes all student data)
    const existingStudent = await mongoose.connection.collection('students').findOne({ email: 'student@test.com' });
    
    if (!existingStudent) {
      await mongoose.connection.collection('students').insertOne({
        email: 'student@test.com',
        password: await bcrypt.hash('password123', 12),
        firstName: 'Alex',
        lastName: 'Johnson',
        studentId: 'STU-2024-001',
        major: 'Computer Science',
        graduationYear: 2026,
        gpa: 3.42,
        totalCredits: 45,
        isActive: true,
        enrolledCourses: [],
        notifications: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('✅ Student created: student@test.com / password123');
    } else {
      console.log('ℹ️ Student already exists');
    }

    // Create Teacher record (includes all teacher data)
    const existingTeacher = await mongoose.connection.collection('teachers').findOne({ email: 'teacher@test.com' });
    
    if (!existingTeacher) {
      await mongoose.connection.collection('teachers').insertOne({
        email: 'teacher@test.com',
        password: await bcrypt.hash('password123', 12),
        firstName: 'Dr. Sarah',
        lastName: 'Mitchell',
        employeeId: 'TCH-2024-001',
        department: 'Computer Science',
        designation: 'professor',
        isActive: true,
        coursesTaught: [],
        rating: 4.5,
        totalReviews: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('✅ Teacher created: teacher@test.com / password123');
    } else {
      console.log('ℹ️ Teacher already exists');
    }

    console.log('\n✅ Seed completed!');
    console.log('\n📋 Database has ONLY 2 collections:');
    console.log('   - students: stores email, password, name, studentId, major, gpa, enrolledCourses');
    console.log('   - teachers: stores email, password, name, employeeId, department, coursesTaught');
    console.log('\n📋 Login Credentials:');
    console.log('   Student: student@test.com / password123');
    console.log('   Teacher: teacher@test.com / password123');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seed();
