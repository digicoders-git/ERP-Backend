const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const ParentStudent = require('./model/ParentStudent');

async function debugParent() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/erp-school');
    console.log('✅ Connected to MongoDB\n');

    const parent = await ParentStudent.findOne({ mobile: '9876543210', role: 'parent' });
    
    if (!parent) {
      console.log('❌ No parent found with mobile 9876543210');
      process.exit(1);
    }

    console.log('✅ Parent Found:');
    console.log('   ID:', parent._id);
    console.log('   Name:', parent.firstName, parent.lastName);
    console.log('   Mobile:', parent.mobile);
    console.log('   Role:', parent.role);
    console.log('   Status:', parent.status);
    console.log('   Children:', parent.children.length);
    console.log('   Password Hash:', parent.password.substring(0, 30) + '...');

    // Test password
    const testPassword = 'parent123';
    const isMatch = await bcrypt.compare(testPassword, parent.password);
    console.log('\n✅ Password Test:');
    console.log('   Test Password:', testPassword);
    console.log('   Match Result:', isMatch);

    if (!isMatch) {
      console.log('\n❌ Password does NOT match!');
      console.log('   This is why login is failing.');
    } else {
      console.log('\n✅ Password matches! Login should work.');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

debugParent();
