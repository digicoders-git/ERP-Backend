const mongoose = require('mongoose');
require('./model/Branch');
require('./model/Client');
const Admin = require('./model/Admin');
const Teacher = require('./model/Teacher');
const bcrypt = require('bcryptjs');

mongoose.connect('mongodb://localhost:27017/ERP').then(async () => {
  try {
    console.log('Testing Teacher Login\n');

    const email = 'teacher1@gmail.com';
    const password = 'teacher123'; // Test password

    // Find teacher admin
    const teacherAdmin = await Admin.findOne({ 
      email, 
      role: 'teacherAdmin' 
    }).populate('teacher').populate('branch');

    if (!teacherAdmin) {
      console.log('Teacher admin not found');
      process.exit(0);
    }

    console.log(`Found teacher admin: ${teacherAdmin.email}`);
    console.log(`Status: ${teacherAdmin.status}`);
    console.log(`Password hash: ${teacherAdmin.password.substring(0, 30)}...`);

    // Test password
    const isPasswordValid = await bcrypt.compare(password, teacherAdmin.password);
    console.log(`\nPassword "${password}" is valid: ${isPasswordValid}`);

    if (!isPasswordValid) {
      console.log('\nTrying to hash and update password...');
      const hashedPassword = await bcrypt.hash(password, 10);
      teacherAdmin.password = hashedPassword;
      await teacherAdmin.save();
      console.log('Password updated successfully');
      
      // Test again
      const isValid = await bcrypt.compare(password, teacherAdmin.password);
      console.log(`Password is now valid: ${isValid}`);
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
