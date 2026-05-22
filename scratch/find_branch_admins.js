const mongoose = require('mongoose');
require('../model/Branch');
require('../model/Client');
const Admin = require('../model/Admin');

mongoose.connect('mongodb://localhost:27017/ERP').then(async () => {
  try {
    console.log('Querying all Admins...\n');
    const admins = await Admin.find({}).lean();
    console.log(`Found ${admins.length} admins:`);
    admins.forEach(a => {
      console.log(`- Email: ${a.email}, Role: ${a.role}, Name: ${a.name}, Status: ${a.status}`);
    });
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}).catch(err => {
  console.error('Connection error:', err.message);
  process.exit(1);
});
