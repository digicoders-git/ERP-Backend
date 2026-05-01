const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

const Driver = require('./model/Driver');
const Route = require('./model/Route');
const Vehicle = require('./model/Vehicle');

async function testDriverTrip() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/erp-school');
    console.log('✅ Connected to MongoDB\n');

    // Get driver, route, vehicle
    const driver = await Driver.findOne().lean();
    const route = await Route.findOne().lean();
    const vehicle = await Vehicle.findOne().lean();

    if (!driver || !route || !vehicle) {
      console.log('❌ Missing driver, route, or vehicle');
      process.exit(1);
    }

    console.log('📋 Test Data:');
    console.log('   Driver:', driver.name, '(' + driver._id + ')');
    console.log('   Route:', route.routeName, '(' + route._id + ')');
    console.log('   Vehicle:', vehicle.vehicleNo, '(' + vehicle._id + ')');

    // Generate JWT token for driver with correct secret
    const jwt = require('jsonwebtoken');
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    
    console.log('\n🔐 JWT Configuration:');
    console.log('   Secret:', jwtSecret.substring(0, 20) + '...');
    
    const token = jwt.sign(
      { _id: driver._id, role: 'driver', branch: driver.branch, client: driver.client },
      jwtSecret,
      { expiresIn: '7d' }
    );

    console.log('   Token:', token.substring(0, 50) + '...\n');

    // Start trip
    console.log('🚀 Starting trip...');
    const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5002';
    
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/transport-panel/trip/start`,
        {
          routeId: route._id.toString(),
          vehicleId: vehicle._id.toString(),
          type: 'morning'
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      console.log('✅ Trip Started Successfully!');
      console.log('Trip ID:', response.data.trip._id);
      console.log('Status:', response.data.trip.status);
      console.log('Tracking Status:', response.data.trip.trackingStatus);
      console.log('\n📍 Stops Created:', response.data.stops.length);

      console.log('\n' + '='.repeat(60));
      console.log('✅ DRIVER TRIP STARTED!');
      console.log('='.repeat(60));
      console.log('\n🎯 Next Steps:');
      console.log('   1. Go to Parent Panel');
      console.log('   2. Login with: 9876543210 / parent123');
      console.log('   3. Select child: Raj Kumar');
      console.log('   4. Go to Track Van');
      console.log('   5. You should see live tracking now!');
      console.log('\n💡 To test more actions:');
      console.log('   - Driver arrives at stop');
      console.log('   - Driver marks attendance');
      console.log('   - Driver departs stop');
      console.log('   - Parents see real-time updates!');
      console.log('='.repeat(60) + '\n');

      process.exit(0);
    } catch (error) {
      console.error('❌ API Error:', error.response?.data || error.message);
      console.error('Status:', error.response?.status);
      console.error('Full Error:', error.response?.data);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testDriverTrip();
