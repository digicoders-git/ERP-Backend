const mongoose = require('mongoose');
require('dotenv').config();

const LiveClass = require('../model/LiveClass');
const Student = require('../model/Student');
const Class = require('../model/Class');

async function debugData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/erp-school');
    console.log('Connected to MongoDB');

    // Check Live Classes
    const liveCount = await LiveClass.countDocuments();
    console.log(`\n=== LIVE CLASSES ===`);
    console.log(`Total: ${liveCount}`);
    
    if (liveCount > 0) {
      const liveClasses = await LiveClass.find().limit(5).lean();
      liveClasses.forEach((lc, idx) => {
        console.log(`${idx + 1}. ${lc.title} - Class: ${lc.class}, Section: ${lc.section}`);
      });
    }

    // Check Students
    const studentCount = await Student.countDocuments();
    console.log(`\n=== STUDENTS ===`);
    console.log(`Total: ${studentCount}`);
    
    if (studentCount > 0) {
      const students = await Student.find()
        .populate('class', 'className')
        .populate('section', 'sectionName')
        .limit(3)
        .lean();
      students.forEach((s, idx) => {
        console.log(`${idx + 1}. ${s.firstName} ${s.lastName} - Class: ${s.class?.className}, Section: ${s.section?.sectionName}`);
      });
    }

    // Check Classes
    const classCount = await Class.countDocuments();
    console.log(`\n=== CLASSES ===`);
    console.log(`Total: ${classCount}`);
    
    if (classCount > 0) {
      const classes = await Class.find().limit(5).lean();
      classes.forEach((c, idx) => {
        console.log(`${idx + 1}. ${c.className} (ID: ${c._id})`);
      });
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

debugData();
