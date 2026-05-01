const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const ParentStudent = require('./model/ParentStudent');
const Student = require('./model/Student');
const Branch = require('./model/Branch');
const Client = require('./model/Client');

async function createTestParent() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/erp-school');
    console.log('Connected to MongoDB');

    // Get first branch and client
    const branch = await Branch.findOne().lean();
    const client = await Client.findOne().lean();
    
    if (!branch || !client) {
      console.log('Branch or Client not found. Please create them first.');
      process.exit(1);
    }

    // Get first 2 students from this branch
    const students = await Student.find({ branch: branch._id }).limit(2).lean();
    
    if (students.length === 0) {
      console.log('No students found in this branch.');
      process.exit(1);
    }

    // Create parent with children
    const hashedPassword = await bcrypt.hash('parent123', 10);
    
    const parent = new ParentStudent({
      firstName: 'Test',
      lastName: 'Parent',
      mobile: '9876543210',
      password: hashedPassword,
      role: 'parent',
      children: students.map(s => ({
        studentId: s._id,
        name: `${s.firstName} ${s.lastName}`,
        class: s.class?.toString(),
        section: s.section?.toString(),
        rollNo: s.rollNumber
      })),
      branch: branch._id,
      client: client._id,
      status: true
    });

    await parent.save();
    console.log('✅ Test parent created successfully!');
    console.log('Mobile: 9876543210');
    console.log('Password: parent123');
    console.log('Children:', parent.children.length);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createTestParent();
