const mongoose = require('mongoose');
const Student = require('../model/Student');
require('dotenv').config();

async function checkStudents() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/ERP';
  console.log('Connecting to:', uri);
  try {
    await mongoose.connect(uri);
    console.log('Connected!');

    const students = await Student.find().limit(5).lean();
    console.log('--- STUDENTS IN DATABASE ---');
    students.forEach(s => {
      console.log({
        id: s._id,
        name: `${s.firstName} ${s.lastName || ''}`,
        admissionNumber: s.admissionNumber,
        dob: s.dob,
        dobType: typeof s.dob,
        dobAsDate: s.dob ? new Date(s.dob) : null,
        dobIsoString: s.dob ? new Date(s.dob).toISOString() : null,
        dobFormattedString: s.dob ? new Date(s.dob).toISOString().split('T')[0] : null
      });
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkStudents();
