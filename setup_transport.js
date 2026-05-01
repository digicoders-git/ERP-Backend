const mongoose = require('mongoose');
require('dotenv').config();

const Branch = require('./model/Branch');
const Client = require('./model/Client');
const Route = require('./model/Route');
const RouteStop = require('./model/RouteStop');
const Vehicle = require('./model/Vehicle');
const Driver = require('./model/Driver');
const TransportAllocation = require('./model/TransportAllocation');
const Student = require('./model/Student');
const Admin = require('./model/Admin');

async function setupTransportData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/erp-school');
    console.log('✅ Connected to MongoDB\n');

    // 1. Get or create Branch
    let branch = await Branch.findOne().lean();
    if (!branch) {
      console.log('Creating branch...');
      const newBranch = new Branch({
        branchName: 'Main Branch',
        branchCode: 'MB001',
        address: '123 School Street',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110001',
        latitude: 28.7041,
        longitude: 77.1025,
        contactNo: '9876543210',
        email: 'branch@school.com',
        status: true
      });
      branch = await newBranch.save();
      console.log('✅ Branch created:', branch._id);
    } else {
      console.log('✅ Branch found:', branch._id);
    }

    // 2. Get or create Client
    let client = await Client.findOne().lean();
    if (!client) {
      console.log('Creating client...');
      const newClient = new Client({
        clientName: 'Test School',
        clientCode: 'TS001',
        email: 'school@test.com',
        phone: '9876543210',
        status: true
      });
      client = await newClient.save();
      console.log('✅ Client created:', client._id);
    } else {
      console.log('✅ Client found:', client._id);
    }

    // 3. Get or create Admin
    console.log('\nGetting admin...');
    let admin = await Admin.findOne().lean();
    if (!admin) {
      console.log('Creating admin...');
      const newAdmin = new Admin({
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@school.com',
        password: 'admin123',
        role: 'admin',
        branch: branch._id,
        client: client._id,
        status: true
      });
      admin = await newAdmin.save();
      console.log('✅ Admin created:', admin._id);
    } else {
      console.log('✅ Admin found:', admin._id);
    }

    // 4. Create Route
    console.log('\nCreating route...');
    let route = await Route.findOne({ branch: branch._id }).lean();
    if (!route) {
      const newRoute = new Route({
        routeName: 'Route A - Morning',
        routeCode: 'RA-M',
        startPoint: 'School Gate',
        endPoint: 'School Gate',
        totalDistance: 25,
        branch: branch._id,
        client: client._id,
        createdBy: admin._id,
        status: true
      });
      route = await newRoute.save();
      console.log('✅ Route created:', route._id);
    } else {
      console.log('✅ Route found:', route._id);
    }

    // 5. Create Route Stops
    console.log('\nCreating route stops...');
    const stopNames = [
      { name: 'Stop A - Market', order: 1, pickupTime: '07:00 AM', dropTime: '03:00 PM' },
      { name: 'Stop B - Park', order: 2, pickupTime: '07:15 AM', dropTime: '02:45 PM' },
      { name: 'Stop C - Main Road', order: 3, pickupTime: '07:30 AM', dropTime: '02:30 PM' }
    ];

    const stops = [];
    for (const stopData of stopNames) {
      let stop = await RouteStop.findOne({ 
        route: route._id, 
        stopName: stopData.name 
      }).lean();
      
      if (!stop) {
        const newStop = new RouteStop({
          route: route._id,
          stopName: stopData.name,
          stopOrder: stopData.order,
          latitude: 28.7041 + (stopData.order * 0.01),
          longitude: 77.1025 + (stopData.order * 0.01),
          pickupTime: stopData.pickupTime,
          dropTime: stopData.dropTime,
          branch: branch._id,
          client: client._id,
          createdBy: admin._id,
          status: true
        });
        stop = await newStop.save();
        console.log(`✅ Stop created: ${stopData.name}`);
      } else {
        console.log(`✅ Stop found: ${stopData.name}`);
      }
      stops.push(stop);
    }

    // 6. Create Vehicle
    console.log('\nCreating vehicle...');
    let vehicle = await Vehicle.findOne({ branch: branch._id }).lean();
    if (!vehicle) {
      const newVehicle = new Vehicle({
        vehicleNo: 'DL01AB1234',
        vehicleType: 'van',
        vehicleCapacity: 50,
        fuelType: 'diesel',
        rcNo: 'RC-DL-01-AB-1234',
        insuranceExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        fitnessExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        branch: branch._id,
        client: client._id,
        createdBy: admin._id,
        status: true
      });
      vehicle = await newVehicle.save();
      console.log('✅ Vehicle created:', vehicle._id);
    } else {
      console.log('✅ Vehicle found:', vehicle._id);
    }

    // 7. Create Driver
    console.log('\nCreating driver...');
    let driver = await Driver.findOne({ branch: branch._id }).lean();
    if (!driver) {
      const newDriver = new Driver({
        name: 'Test Driver',
        mobileNo: '9999999999',
        email: 'driver@test.com',
        licenseNo: 'DL1234567890',
        licenseExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        experience: 5,
        address: '123 Driver Street',
        branch: branch._id,
        client: client._id,
        createdBy: admin._id,
        status: true
      });
      driver = await newDriver.save();
      console.log('✅ Driver created:', driver._id);
    } else {
      console.log('✅ Driver found:', driver._id);
    }

    // 8. Get Student
    console.log('\nGetting student...');
    let student = await Student.findOne().lean();
    if (!student) {
      console.log('❌ No student found in database');
      process.exit(1);
    }
    console.log('✅ Student found:', student.firstName, student.lastName);

    // 9. Create Transport Allocation
    console.log('\nCreating transport allocation...');
    let allocation = await TransportAllocation.findOne({ student: student._id }).lean();
    if (!allocation) {
      const newAllocation = new TransportAllocation({
        userName: `${student.firstName} ${student.lastName}`,
        userType: 'student',
        student: student._id,
        route: route._id,
        routeStop: stops[0]._id,
        vehicle: vehicle._id,
        monthlyCharges: 1500,
        service: 'both',
        joiningDate: new Date(),
        status: true,
        branch: branch._id,
        client: client._id,
        createdBy: admin._id
      });
      allocation = await newAllocation.save();
      console.log('✅ Allocation created:', allocation._id);
    } else {
      console.log('✅ Allocation found:', allocation._id);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ SETUP COMPLETE!');
    console.log('='.repeat(60));
    console.log('\n📋 Test Data Summary:');
    console.log('   Branch:', branch._id);
    console.log('   Client:', client._id);
    console.log('   Route:', route._id);
    console.log('   Stops:', stops.length);
    console.log('   Vehicle:', vehicle._id);
    console.log('   Driver:', driver._id);
    console.log('   Student:', student._id);
    console.log('   Allocation:', allocation._id);
    console.log('\n🔐 Parent Login Credentials:');
    console.log('   Mobile: 9876543210');
    console.log('   Password: parent123');
    console.log('\n🚀 Now you can:');
    console.log('   1. Login as parent');
    console.log('   2. Select child');
    console.log('   3. Go to Track Van');
    console.log('   4. Driver starts trip');
    console.log('   5. See live tracking!');
    console.log('='.repeat(60) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

setupTransportData();
