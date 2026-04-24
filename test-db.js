const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/student-portal')
  .then(async () => {
    const db = mongoose.connection.db;
    const students = await db.collection('students').find({}).toArray();
    console.log(JSON.stringify(students, null, 2));
    process.exit(0);
  });
