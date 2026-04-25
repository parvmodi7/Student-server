const mongoose = require('mongoose');
require('dotenv').config();
const { Course } = require('./src/models');
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const c = await Course.findOne({ courseCode: 'CS101' }).lean();
  console.log('CS101 Attendance:', JSON.stringify(c.attendance, null, 2));
  process.exit(0);
});
