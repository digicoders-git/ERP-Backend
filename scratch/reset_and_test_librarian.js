const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../model/Admin');
const Librarian = require('../model/Librarian');
require('dotenv').config();

async function runTest() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/ERP';
  try {
    await mongoose.connect(uri);
    console.log('Connected to database!');

    const email = 'library@gmail.com';
    const newPassword = '123456';

    // Update Librarian password
    const lib = await Librarian.findOne({ email });
    if (lib) {
      lib.password = newPassword;
      await lib.save();
      console.log('Updated Librarian password in DB');
    } else {
      console.log('Librarian not found');
    }

    // Update Admin password
    const admin = await Admin.findOne({ email, role: 'libraryAdmin' });
    if (admin) {
      admin.password = newPassword;
      await admin.save();
      console.log('Updated Admin password in DB');
    } else {
      console.log('Admin libraryAdmin not found');
    }

    // Now test comparePassword on Admin model directly
    const updatedAdmin = await Admin.findOne({ email, role: 'libraryAdmin' });
    const isMatch = await updatedAdmin.comparePassword(newPassword);
    console.log('Admin comparePassword directly:', isMatch);

    // Let's test the endpoint logic locally
    const loginId = email;
    const adminForLogin = await Admin.findOne({ email: loginId, role: 'libraryAdmin' });
    if (!adminForLogin) {
      console.log('Login logic failed: admin not found');
    } else if (!adminForLogin.status) {
      console.log('Login logic failed: admin status inactive');
    } else {
      const match = await adminForLogin.comparePassword(newPassword);
      console.log('Login logic match:', match);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

runTest();
