const mongoose = require('mongoose');
require('dotenv').config();
require('../model/ClientSettings');
require('../model/Student');

const ClientSettings = mongoose.model('ClientSettings');
const Student = mongoose.model('Student');

async function inspect() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ERP');
    console.log('Connected to DB');

    const settings = await ClientSettings.findOne({}).lean();
    console.log('ID CARD SETTINGS_STUDENT:', JSON.stringify(settings?.idCard?.student, null, 2));

    const student = await Student.findOne({ firstName: /Priya/i }).lean();
    console.log('SAMPLE_STUDENT_PRIYA:', JSON.stringify(student, null, 2));

    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

inspect();
