const mongoose = require('mongoose');
const LibraryMember = require('../model/LibraryMember');
require('dotenv').config();

async function checkMember() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/erp_school');
    console.log('Connected to DB');
    
    const members = await LibraryMember.find({ 
      $or: [
        { name: /Vikram Singh/i },
        { memberId: 'STU-3210' }
      ]
    });
    
    console.log('Found members:', JSON.stringify(members, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

checkMember();
