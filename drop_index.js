require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  try {
    await mongoose.connection.collection('students').dropIndex('userId_1');
    console.log("Index userId_1 dropped successfully.");
  } catch (err) {
    console.log("Error dropping index:", err.message);
  }
  process.exit(0);
}
run();
