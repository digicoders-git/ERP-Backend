const mongoose = require('mongoose');
const Timetable = require('../model/Timetable');
const Student = require('../model/Student');
const ParentStudent = require('../model/ParentStudent');
const Class = require('../model/Class');

async function test() {
  await mongoose.connect('mongodb://localhost:27017/ERP');
  
  // Rahul Kumar's ParentStudent ID
  const userId = '69e232e80813d453fbb4a251';
  const user = await ParentStudent.findById(userId).lean();
  
  console.log('User Role:', user.role);
  console.log('User Branch:', user.branch);
  console.log('User Client:', user.client);
  console.log('User StudentId:', user.studentId);

  const studentId = user.studentId; // Since he's a student
  const student = await Student.findById(studentId).populate('class', 'className').lean();
  
  console.log('Student Found:', !!student);
  console.log('Student Class ID:', student?.class?._id || student?.class);
  console.log('Student Class Name:', student?.class?.className || student?.className);
  console.log('Student Section:', student?.section);

  const branchId = new mongoose.Types.ObjectId(user.branch);
  const clientId = new mongoose.Types.ObjectId(user.client);
  
  const query = { 
    branch: branchId,
    client: clientId,
    $or: [
      { classId: student.class?._id || student.class },
      { className: student.class?.className || student.className }
    ]
  };
  
  console.log('Query:', JSON.stringify(query, null, 2));

  const timetable = await Timetable.find(query).lean();
  console.log('Raw Timetable Found:', timetable.length);

  const filteredTimetable = timetable.filter(t => {
    if (!t.sectionId || !student.section) return true;
    return t.sectionId.toString() === student.section.toString();
  });
  
  console.log('Filtered Timetable Found:', filteredTimetable.length);

  const grouped = {
    'Monday': [], 'Tuesday': [], 'Wednesday': [], 'Thursday': [], 'Friday': [], 'Saturday': [], 'Sunday': []
  };

  filteredTimetable.forEach(t => {
    if (!t.day || !t.subject) return;
    
    let dayName = t.day.trim();
    dayName = dayName.charAt(0).toUpperCase() + dayName.slice(1).toLowerCase();
    
    if (!grouped[dayName]) grouped[dayName] = [];
    grouped[dayName].push({
      subject: t.subject,
      day: dayName
    });
  });

  console.log('Grouped Data Result:', JSON.stringify(grouped, null, 2));
  process.exit(0);
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
