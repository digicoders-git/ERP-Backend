const mongoose = require('mongoose');
const Timetable = require('../model/Timetable');
const Student = require('../model/Student');
const Class = require('../model/Class');

async function test() {
  await mongoose.connect('mongodb://localhost:27017/ERP');
  const studentId = '69d9e65486af4df13dacc0c1';
  const student = await Student.findById(studentId).populate('class', 'className').lean();
  
  console.log('Student Class ID:', student.class?._id || student.class);
  console.log('Student Class Name:', student.class?.className || student.className);
  console.log('Student Section:', student.section);

  const query = { 
    branch: student.branch,
    $or: [
      { classId: student.class?._id || student.class },
      { className: student.class?.className || student.className }
    ]
  };
  
  console.log('Query:', JSON.stringify(query, null, 2));

  const timetable = await Timetable.find(query).lean();
  console.log('Found Timetable entries:', timetable.length);

  const filteredTimetable = timetable.filter(t => {
    if (!t.sectionId || !student.section) return true;
    return t.sectionId.toString() === student.section.toString();
  });
  
  console.log('Filtered Timetable entries:', filteredTimetable.length);

  const grouped = {};
  filteredTimetable.forEach(t => {
    if (!grouped[t.day]) grouped[t.day] = [];
    grouped[t.day].push({
      subject: t.subject,
      day: t.day
    });
  });

  console.log('Grouped Data:', JSON.stringify(grouped, null, 2));
  process.exit(0);
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
