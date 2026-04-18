const mongoose = require('mongoose');
const Admin = require('./model/Admin');
const Teacher = require('./model/Teacher');
const bcrypt = require('bcryptjs');

mongoose.connect('mongodb://localhost:27017/ERP').then(async () => {
  try {
    console.log('Connected to MongoDB\n');

    // Find all teacher admins
    const teacherAdmins = await Admin.find({ role: 'teacherAdmin' }).populate('teacher');
    console.log(`Found ${teacherAdmins.length} teacher admins\n`);

    if (teacherAdmins.length === 0) {
      console.log('No teacher admins found in database');
      process.exit(0);
    }

    teacherAdmins.forEach((admin, index) => {
      console.log(`\n--- Teacher Admin ${index + 1} ---`);
      console.log(`Email: ${admin.email}`);
      console.log(`Status: ${admin.status}`);
      console.log(`Teacher Name: ${admin.teacher?.name || 'N/A'}`);
      console.log(`Password Hash: ${admin.password.substring(0, 20)}...`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}).catch(err => {
  console.error('Connection error:', err.message);
  process.exit(1);
});
