const mongoose = require('mongoose');
const Student = require('../model/Student');

const MONGODB_URI = "mongodb://localhost:27017/ERP";

async function checkTypes() {
  await mongoose.connect(MONGODB_URI);
  const student = await Student.findOne();
  if (student) {
      console.log('Class Type:', typeof student.class, student.class.constructor.name);
      console.log('Section Type:', typeof student.section, student.section.constructor.name);
      console.log('Class Value:', student.class);
  }
  await mongoose.disconnect();
}
checkTypes();
