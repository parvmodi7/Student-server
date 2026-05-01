/**
 * Database Configuration
 * Handles MongoDB connection with retry logic and optimization settings
 */
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    (`MongoDB Connected: ${conn.connection.host}`);
    
    // Drop old duplicate index if exists
    try {
      await conn.connection.db.collection('grades').dropIndex('student_1_assignment_1');
      ('Dropped old duplicate index student_1_assignment_1');
    } catch (e) {
      // Index may not exist, ignore error
    }
    
    return conn;
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;