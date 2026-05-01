const mongoose = require('mongoose');
const Teacher = require('../model/Teacher');
const Student = require('../model/Student');
const Class = require('../model/Class');
const Section = require('../model/Section');
const Timetable = require('../model/Timetable');

const MONGODB_URI = "mongodb://localhost:27017/ERP";

async function debugStudents() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const teacher = await Teacher.findOne({ name: /Mayank Pandey/i });
    if (!teacher) {
      console.log('Teacher not found');
      return;
    }

    console.log('Teacher Found:', teacher.name, 'Branch:', teacher.branch);

    const students = await Student.find({ branch: teacher.branch });
    console.log('Total Students in Branch:', students.length);

    if (students.length > 0) {
        console.log('Sample Student Class/Section IDs:');
        students.slice(0, 5).forEach(s => {
            console.log(`- ${s.firstName}: Class ${s.class}, Section ${s.section}`);
        });
    }

    const tt = await Timetable.find({ teacherId: teacher._id });
    console.log('Timetable entries for teacher:', tt.length);
    if (tt.length > 0) {
        console.log('Unique Class/Section pairs in Timetable:');
        const pairs = new Set();
        tt.forEach(e => pairs.add(`${e.classId}-${e.sectionId}`));
        pairs.forEach(p => console.log(`- ${p}`));
    }

    // Check Class 11 Section B
    const class11 = await Class.findOne({ className: /Class 11/i, branch: teacher.branch });
    const sectionB = await Section.findOne({ sectionName: /B/i, branch: teacher.branch });

    if (class11 && sectionB) {
        console.log(`Searching for students in Class ${class11._id} and Section ${sectionB._id}`);
        const count = await Student.countDocuments({ 
            branch: teacher.branch, 
            class: class11._id, 
            section: sectionB._id 
        });
        console.log(`Found ${count} students in Class 11 Section B`);
    } else {
        console.log('Class 11 or Section B not found');
    }

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

debugStudents();
