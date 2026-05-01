const mongoose = require('mongoose');
require('dotenv').config();

const TransportAllocation = require('./model/TransportAllocation');
const Student = require('./model/Student');
const Route = require('./model/Route');
const RouteStop = require('./model/RouteStop');
const Vehicle = require('./model/Vehicle');
const Branch = require('./model/Branch');
const Client = require('./model/Client');

async function checkAndCreateAllocation() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/erp-school');
    console.log('Connected to MongoDB');

    // Get first student
    const student = await Student.findOne().lean();
    if (!student) {
      console.log('No student found');
      process.exit(1);
    }

    console.log(`\n📍 Checking allocation for student: ${student.firstName} ${student.lastName}`);

    // Check if allocation exists
    let allocation = await TransportAllocation.findOne({ student: student._id }).lean();
    
    if (allocation) {
      console.log('✅ Allocation already exists:');
      console.log('   Route:', allocation.route);
      console.log('   Stop:', allocation.routeStop);
      console.log('   Status:', allocation.status);
      process.exit(0);
    }

    console.log('❌ No allocation found. Creating one...\n');

    // Get route, stop, vehicle
    const route = await Route.findOne().lean();
    const stop = await RouteStop.findOne().lean();
    const vehicle = await Vehicle.findOne().lean();
    const branch = student.branch;
    const client = student.client;

    if (!route || !stop || !vehicle) {
      console.log('Missing route, stop, or vehicle. Please create them first.');
      console.log('Route:', !!route, 'Stop:', !!stop, 'Vehicle:', !!vehicle);
      process.exit(1);
    }

    // Create allocation
    const newAllocation = new TransportAllocation({
      userName: `${student.firstName} ${student.lastName}`,
      userType: 'student',
      student: student._id,
      route: route._id,
      routeStop: stop._id,
      vehicle: vehicle._id,
      monthlyCharges: 1000,
      service: 'both',
      joiningDate: new Date(),
      status: true,
      branch,
      client,
      createdBy: new mongoose.Types.ObjectId() // Dummy admin ID
    });

    await newAllocation.save();
    console.log('✅ Allocation created successfully!');
    console.log('   Student:', student.firstName, student.lastName);
    console.log('   Route:', route._id);
    console.log('   Stop:', stop._id);
    console.log('   Vehicle:', vehicle._id);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkAndCreateAllocation();
