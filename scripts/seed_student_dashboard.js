const mongoose = require('mongoose');
require('dotenv').config();

// Define IDs for STU-2420
const SID = "69d9e65486af4df13dacc0c1";
const CLASS_ID = "69d7817d9c4058285eb24159";
const SECTION_ID = "69d78462381a1592587ae72b";
const BRANCH_ID = "69d61d2fa9c89eaa23b68dec";
const CLIENT_ID = "69d600eab45ba5f7c0137cf6";
const ADMIN_ID = "69d62554dc2e95d637ef2024";

// Models
const Attendance = require('../model/Attendance');
const FeeCollection = require('../model/FeeCollection');
const Timetable = require('../model/Timetable');
const Assignment = require('../model/Assignment');
const Notice = require('../model/Notice');
const Book = require('../model/Book');
const BookIssue = require('../model/BookIssue');
const Hostel = require('../model/Hostel');
const HostelAllocation = require('../model/HostelAllocation');
const HostelService = require('../model/HostelService');
const Diary = require('../model/Diary');
const LiveClass = require('../model/LiveClass');
const VideoClass = require('../model/VideoClass');
const Event = require('../model/Event');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ERP');
    console.log('Connected to DB');

    // 1. Attendance (Last 15 days)
    console.log('Seeding Attendance...');
    for (let i = 0; i < 15; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      if (date.getDay() === 0) continue; // Skip Sundays

      const existing = await Attendance.findOne({ studentId: SID, date: { $gte: new Date(date.setHours(0,0,0,0)), $lte: new Date(date.setHours(23,59,59,999)) } });
      if (!existing) {
        await Attendance.create({
          studentId: SID,
          classId: CLASS_ID,
          sectionId: SECTION_ID,
          type: 'student',
          status: Math.random() > 0.1 ? 'present' : 'absent',
          date: date,
          branch: BRANCH_ID,
          client: CLIENT_ID,
          markedBy: ADMIN_ID
        });
      }
    }

    // 2. Fees
    console.log('Seeding Fees...');
    const feeTypes = ['Tuition Fee', 'Transport Fee', 'Special Event Fee'];
    for (const type of feeTypes) {
       const existing = await FeeCollection.findOne({ student: SID, feeType: type });
       if (!existing) {
         await FeeCollection.create({
           student: SID,
           feeType: type,
           amount: 5000,
           amountPaid: type === 'Tuition Fee' ? 5000 : 0,
           balance: type === 'Tuition Fee' ? 0 : 5000,
           status: type === 'Tuition Fee' ? 'paid' : 'pending',
           paymentDate: new Date(),
           paymentMode: 'Cash',
           branch: BRANCH_ID,
           client: CLIENT_ID,
           collectedBy: ADMIN_ID
         });
       }
    }

    // 3. Timetable (Weekly)
    console.log('Seeding Timetable...');
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const subjects = ['Physics', 'Chemistry', 'Maths', 'English', 'P.E.'];
    for (const day of days) {
      for (let i = 0; i < 3; i++) {
        const existing = await Timetable.findOne({ classId: CLASS_ID, sectionId: SECTION_ID, day, subject: subjects[i] });
        if (!existing) {
          await Timetable.create({
            day,
            subject: subjects[i],
            startTime: `${9 + i}:00`,
            endTime: `${10 + i}:00`,
            room: `Room ${101 + i}`,
            classId: CLASS_ID,
            sectionId: SECTION_ID,
            teacherName: 'John Doe',
            branch: BRANCH_ID,
            client: CLIENT_ID,
            createdBy: ADMIN_ID
          });
        }
      }
    }

    // 4. Assignments
    console.log('Seeding Assignments...');
    const existingAssign = await Assignment.findOne({ class: CLASS_ID, title: 'Quantum Mechanics Basics' });
    if (!existingAssign) {
      await Assignment.create({
        class: CLASS_ID,
        section: SECTION_ID,
        title: 'Quantum Mechanics Basics',
        subject: 'Physics',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        totalStudents: 30,
        description: 'Complete the numerical problems on page 45-50.',
        marks: 20,
        status: 'active',
        branch: BRANCH_ID,
        client: CLIENT_ID,
        createdBy: ADMIN_ID
      });
    }

    // 5. Notices
    console.log('Seeding Notices...');
    const existingNotice = await Notice.findOne({ branch: BRANCH_ID, title: 'Annual Cultural Fest 2026' });
    if (!existingNotice) {
      await Notice.create({
        title: 'Annual Cultural Fest 2026',
        type: 'event',
        targetAudience: ['student', 'parent'],
        class: 'All',
        priority: 'high',
        publishDate: new Date(),
        content: 'We are excited to announce the Annual Cultural Fest starting next Monday!',
        isPublished: true,
        branch: BRANCH_ID,
        client: CLIENT_ID,
        createdBy: ADMIN_ID
      });
    }

    // 6. Library
    console.log('Seeding Library...');
    let book = await Book.findOne({ title: 'Brief History of Time' });
    if (!book) {
      book = await Book.create({
        title: 'Brief History of Time',
        author: 'Stephen Hawking',
        ISBN: '9780553109580',
        category: 'Science',
        totalCopies: 5,
        availableCopies: 4,
        branch: BRANCH_ID,
        client: CLIENT_ID,
        createdBy: ADMIN_ID
      });
    }
    const existingIssue = await BookIssue.findOne({ member: SID, book: book._id });
    if (!existingIssue) {
      await BookIssue.create({
        member: SID,
        memberType: 'Student',
        book: book._id,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        status: 'issued',
        branch: BRANCH_ID,
        client: CLIENT_ID,
        issuedBy: ADMIN_ID
      });
    }

    // 7. Hostel
    console.log('Seeding Hostel...');
    let hostel = await Hostel.findOne({ branch: BRANCH_ID });
    if (!hostel) {
       hostel = await Hostel.create({
         hostelName: 'Evergreen Boys Hostel',
         hostelType: 'boys',
         address: 'Main Campus',
         contactNo: '9876543210',
         totalRooms: 50,
         branch: BRANCH_ID,
         client: CLIENT_ID,
         createdBy: ADMIN_ID
       });
    }
    const existingAlloc = await HostelAllocation.findOne({ studentId: SID });
    if (!existingAlloc) {
      await HostelAllocation.create({
        studentId: SID,
        studentName: 'Rahul Kumar',
        hostel: hostel._id,
        roomNo: 'A-201',
        joiningDate: new Date(),
        monthlyRent: 3500,
        securityDeposit: 5000,
        allocationStatus: 'allocated',
        branch: BRANCH_ID,
        client: CLIENT_ID,
        createdBy: ADMIN_ID
      });
    }

    // 8. Hostel Services
    console.log('Seeding Hostel Services...');
    const existingService = await HostelService.findOne({ studentId: SID, serviceType: 'Laundry' });
    if (!existingService) {
      await HostelService.create({
        studentId: SID,
        studentName: 'Rahul Kumar',
        serviceType: 'Laundry',
        serviceCategory: 'Laundry',
        description: 'Monthly laundry pass',
        date: new Date().toISOString().split('T')[0],
        time: '10:00 AM',
        status: 'Pending'
      });
    }

    // 9. E-Diary
    console.log('Seeding E-Diary...');
    const existingDiary = await Diary.findOne({ class: CLASS_ID, title: 'Physics Lab Preparation' });
    if (!existingDiary) {
      await Diary.create({
        title: 'Physics Lab Preparation',
        date: new Date(),
        type: 'homework',
        priority: 'normal',
        class: CLASS_ID,
        content: 'Read Experiment 4 instructions before coming to class.',
        branch: BRANCH_ID,
        client: CLIENT_ID,
        createdBy: ADMIN_ID
      });
    }

    // 9. Live & Recorded Classes
    console.log('Seeding E-Learning...');
    const existingLive = await LiveClass.findOne({ class: CLASS_ID, title: 'Introduction to Calculus' });
    if (!existingLive) {
      await LiveClass.create({
        title: 'Introduction to Calculus',
        subject: 'Maths',
        meetLink: 'https://meet.google.com/abc-defg-hij',
        date: new Date(Date.now() + 2 * 60 * 60 * 1000), // In 2 hours
        duration: '1 Hour',
        class: CLASS_ID,
        section: SECTION_ID,
        status: 'Scheduled',
        branch: BRANCH_ID,
        client: CLIENT_ID,
        createdBy: ADMIN_ID
      });
    }

    const existingVideo = await VideoClass.findOne({ class: CLASS_ID, title: 'Atomic Structure' });
    if (!existingVideo) {
      await VideoClass.create({
        title: 'Atomic Structure',
        subject: 'Chemistry',
        duration: '45 Mins',
        thumbnailUrl: 'https://via.placeholder.com/300x200',
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        class: CLASS_ID,
        section: SECTION_ID,
        branch: BRANCH_ID,
        client: CLIENT_ID,
        createdBy: ADMIN_ID
      });
    }

    // 10. Events (Dashboard)
    console.log('Seeding Events...');
    const existingEvent = await Event.findOne({ title: 'Science Exhibition' });
    if (!existingEvent) {
       await Event.create({
         title: 'Science Exhibition',
         description: 'Showcase your innovations!',
         date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
         type: 'Academic',
         status: 'upcoming',
         branch: BRANCH_ID,
         client: CLIENT_ID,
         createdBy: ADMIN_ID
       });
    }

    console.log('Seeding Completed Successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding Error:', err);
    process.exit(1);
  }
}

seed();
