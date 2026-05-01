const mongoose = require('mongoose');
const Admin = require('../model/Admin');
const Branch = require('../model/Branch');
const Client = require('../model/Client');
require('dotenv').config();

async function checkProfile() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/erp_school');
    console.log('Connected to DB');
    
    // Find a library admin
    const admin = await Admin.findOne({ role: 'libraryAdmin' }).populate('branch').lean();
    if (!admin) {
      console.log('No library admin found');
      process.exit(0);
    }
    
    console.log('Admin Branch:', JSON.stringify(admin.branch, null, 2));
    
    if (admin.branch && admin.branch.client) {
        const client = await Client.findById(admin.branch.client).lean();
        console.log('Client (School) Logo:', client ? client.logo : 'Not found');
    }

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

checkProfile();
