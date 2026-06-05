const mongoose = require('mongoose');
const Admin = require('../model/Admin');
const Librarian = require('../model/Librarian');
require('dotenv').config();

async function checkLibrarians() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/ERP';
  console.log('Connecting to:', uri);
  try {
    await mongoose.connect(uri);
    console.log('Connected!');

    const librarians = await Librarian.find().lean();
    console.log('--- LIBRARIANS IN DATABASE ---');
    console.log(JSON.stringify(librarians, null, 2));

    const admins = await Admin.find({ role: 'libraryAdmin' }).lean();
    console.log('--- ADMIN RECORDS FOR LIBRARYADMIN ---');
    console.log(JSON.stringify(admins, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkLibrarians();
