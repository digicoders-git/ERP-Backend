const mongoose = require('mongoose');
require('dotenv').config();

async function checkAllocations() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/ERP';
    console.log('Connecting to:', mongoUri);
    
    await mongoose.connect(mongoUri);
    console.log('Connected to DB');

    const TransportAllocation = require('./model/TransportAllocation');
    
    // Get raw allocation without populate
    const allocs = await TransportAllocation.find().limit(2).lean();
    
    console.log('\n=== RAW ALLOCATIONS (without populate) ===');
    console.log(JSON.stringify(allocs, null, 2));

    // Get with populate
    const allocsPopulated = await TransportAllocation.find()
      .populate('student', 'firstName email')
      .populate('staff', 'name email')
      .populate('route', 'routeName')
      .limit(2);
    
    console.log('\n=== POPULATED ALLOCATIONS ===');
    allocsPopulated.forEach((a, i) => {
      console.log(`\nAllocation ${i+1}:`);
      console.log('  userType:', a.userType);
      console.log('  student:', a.student);
      console.log('  staff:', a.staff);
      console.log('  route:', a.route);
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkAllocations();
