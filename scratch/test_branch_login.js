require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const adminController = require('../controller/adminController');
const Admin = require('../model/Admin');
const Client = require('../model/Client');
const Branch = require('../model/Branch');

async function test() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ERP');

  // Let's create a mock req and res
  const req = {
    body: {
      email: 'branch@gmail.com',
      password: '123', // what is the password? Let's see if we can try a few, or find what it is
      panel: 'branchAdmin'
    }
  };

  const res = {
    status: function(code) {
      console.log('STATUS CODE:', code);
      return this;
    },
    json: function(data) {
      console.log('JSON RESPONSE:', JSON.stringify(data, null, 2));
      return this;
    }
  };

  try {
    await adminController.loginAdmin(req, res);
  } catch (err) {
    console.error('CAUGHT ERROR:', err);
  }
  process.exit();
}

test().catch(console.error);
