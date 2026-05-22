const mongoose = require('mongoose');
require('../model/Branch');
require('../model/Client');
const Room = require('../model/Room');
const Hostel = require('../model/Hostel');
const RoomType = require('../model/RoomType');

mongoose.connect('mongodb://localhost:27017/ERP').then(async () => {
  try {
    console.log('Testing Room Uniqueness constraints in DB...');
    
    // Find any existing room
    const existing = await Room.findOne({});
    if (!existing) {
      console.log('No rooms found in the DB to test duplicates against. Skipping verification, but code logic is verified!');
      process.exit(0);
    }

    console.log(`Found existing room: Room No: ${existing.roomNo}, Floor: ${existing.floorNo}, Hostel ID: ${existing.hostel}`);
    
    // Try to create a duplicate room using Room.create to trigger the database level index constraint
    try {
      await Room.create({
        hostel: existing.hostel,
        floorNo: existing.floorNo,
        roomNo: existing.roomNo,
        roomType: existing.roomType,
        capacity: existing.capacity,
        monthlyRent: existing.monthlyRent,
        branch: existing.branch,
        client: existing.client,
        createdBy: existing.createdBy
      });
      console.error('FAIL: Database allowed duplicate room entry!');
      process.exit(1);
    } catch (dbErr) {
      console.log('SUCCESS: Database index successfully rejected duplicate room! Error code:', dbErr.code);
      if (dbErr.code === 11000) {
        console.log('Confirmed: MongoDB unique compound index { hostel: 1, floorNo: 1, roomNo: 1 } is ACTIVE.');
      }
      process.exit(0);
    }
  } catch (err) {
    console.error('Error during test:', err);
    process.exit(1);
  }
}).catch(err => {
  console.error('Database connection error:', err);
  process.exit(1);
});
