const mongoose = require('mongoose');
require('../model/Branch');
require('../model/Client');
const Admin = require('../model/Admin');

mongoose.connect('mongodb://localhost:27017/ERP').then(async () => {
  try {
    const admin = await Admin.findOne({ email: 'branch@gmail.com', role: 'branchAdmin' });
    if (admin) {
      admin.password = 'branch123';
      await admin.save();
      console.log('Successfully set password for branch@gmail.com to branch123');
    } else {
      console.log('branchAdmin admin user not found');
    }
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}).catch(err => {
  console.error('Connection error:', err.message);
  process.exit(1);
});
