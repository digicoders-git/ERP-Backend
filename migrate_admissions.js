const mongoose = require('mongoose');
const Student = require('./model/Student');

// Connect to DB directly (modify URI if needed)
const MONGODB_URI = 'mongodb://localhost:27017/ERP';

async function migrate() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to DB');

    const students = await Student.find({ admissionNumber: { $exists: false } });
    console.log(`Found ${students.length} students without admission number.`);

    for (let student of students) {
      const randomPart = Math.floor(Math.random() * 9000) + 1000;
      student.admissionNumber = `STU-${randomPart}`;
      await student.save();
      console.log(`Updated student ${student._id} with admissionNumber ${student.admissionNumber}`);
    }

    // Also check for empty strings or null
    const studentsEmpty = await Student.find({ admissionNumber: null });
    console.log(`Found ${studentsEmpty.length} students with null admission number.`);
    for (let student of studentsEmpty) {
      const randomPart = Math.floor(Math.random() * 9000) + 1000;
      student.admissionNumber = `STU-${randomPart}`;
      await student.save();
      console.log(`Updated student ${student._id} with admissionNumber ${student.admissionNumber}`);
    }

    console.log('Migration complete');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

migrate();
