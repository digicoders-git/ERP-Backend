const mongoose = require('mongoose');
require('dotenv').config();

const Driver = require('./model/Driver');

async function debugDriver() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/erp-school');
    console.log('✅ Connected to MongoDB\n');

    const driver = await Driver.findOne().lean();
    
    if (!driver) {
      console.log('❌ No driver found in database');
      process.exit(1);
    }

    console.log('✅ Driver Found:');
    console.log('   ID:', driver._id);
    console.log('   Name:', driver.name);
    console.log('   Email:', driver.email);
    console.log('   Mobile:', driver.mobileNo);
    console.log('   Branch:', driver.branch);
    console.log('   Client:', driver.client);
    console.log('   Status:', driver.status);

    // Try to find by ID
    const foundById = await Driver.findById(driver._id).lean();
    console.log('\n✅ Driver found by ID:', !!foundById);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

debugDriver();
