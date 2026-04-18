const mongoose = require('mongoose');
require('dotenv').config();

// Global Context
const SID = "69d9e65486af4df13dacc0c1";
const CLASS_ID = "69d7817d9c4058285eb24159";
const SECTION_ID = "69d78462381a1592587ae72b";
const BRANCH_ID = "69d61d2fa9c89eaa23b68dec";
const CLIENT_ID = "69d600eab45ba5f7c0137cf6";
const ADMIN_ID = "69d62554dc2e95d637ef2024";

// Models
const LiveClass = require('../model/LiveClass');
const VideoClass = require('../model/VideoClass');
const Diary = require('../model/Diary');
const Notice = require('../model/Notice');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ERP');
    console.log('Connected to DB');

    // 1. More Live Classes
    console.log('Seeding more Live Classes...');
    const liveItems = [
      { title: 'Algebra & Geometry', subject: 'Maths', time: '11:00 AM' },
      { title: 'Organic Chemistry II', subject: 'Chemistry', time: '02:00 PM' },
      { title: 'Python Programming Basics', subject: 'Computer', time: '04:00 PM' }
    ];
    for (const item of liveItems) {
      const existing = await LiveClass.findOne({ class: CLASS_ID, title: item.title });
      if (!existing) {
        await LiveClass.create({
          title: item.title,
          subject: item.subject,
          meetLink: 'https://meet.google.com/xyz-pdqk-rst',
          date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
          startTime: item.time,
          duration: '1 Hour',
          class: CLASS_ID,
          section: SECTION_ID,
          status: 'Scheduled',
          branch: BRANCH_ID,
          client: CLIENT_ID,
          createdBy: ADMIN_ID
        });
      }
    }

    // 2. More Video Lectures
    console.log('Seeding more Video Lectures...');
    const videoItems = [
      { title: 'Laws of Motion', subject: 'Physics', duration: '30 Mins' },
      { title: 'The Cell Structure', subject: 'Biology', duration: '25 Mins' },
      { title: 'Quadratic Equations', subject: 'Maths', duration: '40 Mins' },
      { title: 'Indian Independence Act', subject: 'History', duration: '50 Mins' },
      { title: 'Periodic Table Mastery', subject: 'Chemistry', duration: '35 Mins' }
    ];
    for (const item of videoItems) {
      const existing = await VideoClass.findOne({ class: CLASS_ID, title: item.title });
      if (!existing) {
        await VideoClass.create({
          title: item.title,
          subject: item.subject,
          duration: item.duration,
          thumbnailUrl: `https://picsum.photos/seed/${item.title.replace(/\s/g, '')}/300/200`,
          videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
          class: CLASS_ID,
          section: SECTION_ID,
          branch: BRANCH_ID,
          client: CLIENT_ID,
          createdBy: ADMIN_ID
        });
      }
    }

    // 3. More E-Diary Entries
    console.log('Seeding more E-Diary entries...');
    const diaryItems = [
      { title: 'Biology Diagram Homework', type: 'homework', content: 'Draw and label the human heart diagram in your practical files.' },
      { title: 'Parent-Teacher Meeting Reminder', type: 'reminder', content: 'PTM scheduled for Saturday at 10 AM. Both parents are requested to attend.' },
      { title: 'Sports Kit Requirement', type: 'important', content: 'Students must bring their full sports kit for the upcoming inter-section match.' },
      { title: 'Excellent Performance in Quiz', type: 'student_observation', content: 'Student showed exceptional understanding of Chemical Bonding in today\'s quiz.' },
      { title: 'Maths Exercise 5.2', type: 'homework', content: 'Solve questions 1-10 from Exercise 5.2 of the textbook.' }
    ];
    for (const item of diaryItems) {
      const existing = await Diary.findOne({ class: CLASS_ID, title: item.title });
      if (!existing) {
        await Diary.create({
          title: item.title,
          date: new Date(),
          type: item.type,
          priority: item.type === 'homework' ? 'high' : 'normal',
          class: CLASS_ID,
          content: item.content,
          branch: BRANCH_ID,
          client: CLIENT_ID,
          createdBy: ADMIN_ID
        });
      }
    }

    // 4. More Notices
    console.log('Seeding more Notices...');
    const noticeItems = [
      { title: 'Summer Vacations Announcement', type: 'holiday', priority: 'medium', content: 'Summer vacations will commence from May 15th to June 30th.' },
      { title: 'Revision Classes Schedule', type: 'academic', priority: 'high', content: 'Extra revision classes for Board Exams will start from next Monday, 8 AM - 9 AM.' },
      { title: 'School ID Card Update', type: 'general', priority: 'normal', content: 'Students who haven\'t received their new ID cards should contact the administrative office.' }
    ];
    for (const item of noticeItems) {
      const existing = await Notice.findOne({ branch: BRANCH_ID, title: item.title });
      if (!existing) {
        await Notice.create({
          title: item.title,
          type: item.type,
          targetAudience: ['student', 'parent'],
          class: 'All',
          priority: item.priority,
          publishDate: new Date(),
          content: item.content,
          isPublished: true,
          branch: BRANCH_ID,
          client: CLIENT_ID,
          createdBy: ADMIN_ID
        });
      }
    }

    console.log('Additional Seeding Completed Successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding Error:', err);
    process.exit(1);
  }
}

seed();
