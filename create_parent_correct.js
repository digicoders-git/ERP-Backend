const mongoose = require('mongoose');
require('dotenv').config();

const ParentStudent = require('./model/ParentStudent');
const Student = require('./model/Student');
const Branch = require('./model/Branch');
const Client = require('./model/Client');

async function createTestParent() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/erp-school');
    console.log('✅ Connected to MongoDB\n');

    // Get branch and client
    const branch = await Branch.findOne().lean();
    const client = await Client.findOne().lean();
    
    if (!branch || !client) {
      console.log('❌ Branch or Client not found');
      process.exit(1);
    }

    // Get first student
    const student = await Student.findOne({ branch: branch._id }).lean();
    if (!student) {
      console.log('❌ No student found');
      process.exit(1);
    }

    console.log('📋 Test Data:');
    console.log('   Branch:', branch._id);
    console.log('   Client:', client._id);
    console.log('   Student:', student.firstName, student.lastName);

    // Delete existing parent if any
    await ParentStudent.deleteOne({ mobile: '9876543210', role: 'parent' });
    console.log('\n🗑️  Deleted old parent record\n');

    // Create new parent with PLAIN password (model will hash it)
    const parent = new ParentStudent({
      firstName: 'Test',
      lastName: 'Parent',
      mobile: '9876543210',
      password: 'parent123',  // PLAIN password - model will hash it
      role: 'parent',
      children: [{
        studentId: student._id,
        name: `${student.firstName} ${student.lastName}`,
        class: student.class?.toString(),
        section: student.section?.toString(),
        rollNo: student.rollNumber
      }],
      branch: branch._id,
      client: client._id,
      status: true
    });

    await parent.save();
    console.log('✅ Parent created successfully!\n');
    console.log('🔐 Login Credentials:');
    console.log('   Mobile: 9876543210');
    console.log('   Password: parent123');
    console.log('\n📱 Child:');
    console.log('   Name:', `${student.firstName} ${student.lastName}`);
    console.log('   ID:', student._id);

    // Verify by fetching and testing
    const bcrypt = require('bcryptjs');
    const saved = await ParentStudent.findById(parent._id);
    const isMatch = await bcrypt.compare('parent123', saved.password);
    console.log('\n✅ Password verification:', isMatch ? 'SUCCESS ✓' : 'FAILED ✗');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createTestParent();
