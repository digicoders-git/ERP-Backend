const mongoose = require('mongoose');
require('./model/Branch');
require('./model/Client');
const Admin = require('./model/Admin');
const Teacher = require('./model/Teacher');
const bcrypt = require('bcryptjs');

mongoose.connect('mongodb://localhost:27017/ERP').then(async () => {
  try {
    console.log('Updating Teacher Passwords\n');

    const testPassword = 'teacher123';

    // Update teacher1@gmail.com
    const teacherAdmin = await Admin.findOne({ 
      email: 'teacher1@gmail.com', 
      role: 'teacherAdmin' 
    });

    if (teacherAdmin) {
      console.log(`Updating password for: ${teacherAdmin.email}`);
      
      // Set plain password - pre-save hook will hash it
      teacherAdmin.password = testPassword;
      await teacherAdmin.save();
      
      console.log('Password updated');
      
      // Verify by fetching fresh from DB
      const updated = await Admin.findById(teacherAdmin._id);
      const isValid = await bcrypt.compare(testPassword, updated.password);
      console.log(`Verification: Password "${testPassword}" is valid: ${isValid}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}).catch(err => {
  console.error('Connection error:', err.message);
  process.exit(1);
});
