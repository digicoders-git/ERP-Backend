const mongoose = require('mongoose');
require('dotenv').config();
const Admin = require('../model/Admin');
const Teacher = require('../model/Teacher');
const Staff = require('../model/Staff');

async function checkEmail() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const email = 'teacher@gmail.com';
    
    console.log(`Checking email: ${email}`);
    
    // Exact match
    const adminExact = await Admin.findOne({ email });
    const teacherExact = await Teacher.findOne({ email });
    const staffExact = await Staff.findOne({ email });
    
    console.log('--- Exact Match Results ---');
    console.log('Admin:', adminExact ? 'Found (ID: ' + adminExact._id + ', Role: ' + adminExact.role + ')' : 'Not Found');
    console.log('Teacher:', teacherExact ? 'Found (ID: ' + teacherExact._id + ')' : 'Not Found');
    console.log('Staff:', staffExact ? 'Found (ID: ' + staffExact._id + ')' : 'Not Found');
    
    // Case-insensitive match check
    const adminCI = await Admin.findOne({ email: { $regex: new RegExp('^' + email + '$', 'i') } });
    const teacherCI = await Teacher.findOne({ email: { $regex: new RegExp('^' + email + '$', 'i') } });
    
    console.log('\n--- Case-Insensitive Match Results ---');
    console.log('Admin:', adminCI ? 'Found (ID: ' + adminCI._id + ', Email: ' + adminCI.email + ')' : 'Not Found');
    console.log('Teacher:', teacherCI ? 'Found (ID: ' + teacherCI._id + ', Email: ' + teacherCI.email + ')' : 'Not Found');

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkEmail();
