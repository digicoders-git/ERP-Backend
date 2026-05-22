require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
require('../model/Branch');
require('../model/Client');
const Admin = require('../model/Admin');

async function list() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ERP');
  const admins = await Admin.find().populate('branch', 'branchName branchCode').populate('client', 'name');
  console.log("Total Admins found:", admins.length);
  admins.forEach(a => {
    console.log({
      id: a._id,
      name: a.name,
      email: a.email,
      role: a.role,
      password: a.password,
      status: a.status,
      branch: a.branch ? `${a.branch.branchName} (${a.branch.branchCode})` : null,
      client: a.client ? a.client.name : null
    });
  });
  process.exit();
}

list().catch(console.error);
