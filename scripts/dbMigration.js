const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Load Models
const Student = require('../model/Student');
const Teacher = require('../model/Teacher');
const Staff = require('../model/Staff');
const Notice = require('../model/Notice');
const Diary = require('../model/Diary');
const Resource = require('../model/Resource');
const DigitalLibrary = require('../model/DigitalLibrary');
const Warden = require('../model/Warden');

async function connect() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');
}

async function updateFilePaths() {
  console.log('Starting DB migration to update file paths...');

  // Helper to fix path: uploads/filename -> uploads/panel/category/filename
  const fixPath = (oldPath, panel, category) => {
    if (!oldPath || oldPath.startsWith('http') || oldPath.includes('/' + category + '/')) return oldPath;
    const filename = path.basename(oldPath);
    return `uploads/${panel}/${category}/${filename}`;
  };

  try {
    // 1. Students
    const students = await Student.find({});
    for (let s of students) {
      let changed = false;
      if (s.profileImage) { s.profileImage = fixPath(s.profileImage, 'students', 'profile'); changed = true; }
      
      if (s.documents) {
        if (s.documents.marksheet) { s.documents.marksheet = fixPath(s.documents.marksheet, 'students', 'documents'); changed = true; }
        if (s.documents.characterCertificate) { s.documents.characterCertificate = fixPath(s.documents.characterCertificate, 'students', 'documents'); changed = true; }
        if (s.documents.transferCertificate) { s.documents.transferCertificate = fixPath(s.documents.transferCertificate, 'students', 'documents'); changed = true; }
        if (s.documents.birthCertificate) { s.documents.birthCertificate = fixPath(s.documents.birthCertificate, 'students', 'documents'); changed = true; }
        if (s.documents.aadharCard) { s.documents.aadharCard = fixPath(s.documents.aadharCard, 'students', 'documents'); changed = true; }
      }

      if (s.previousEducation) {
        if (s.previousEducation.marksheet) { s.previousEducation.marksheet = fixPath(s.previousEducation.marksheet, 'students', 'documents'); changed = true; }
        if (s.previousEducation.characterCertificate) { s.previousEducation.characterCertificate = fixPath(s.previousEducation.characterCertificate, 'students', 'documents'); changed = true; }
        if (s.previousEducation.transferCertificate) { s.previousEducation.transferCertificate = fixPath(s.previousEducation.transferCertificate, 'students', 'documents'); changed = true; }
      }

      if (changed) {
        s.markModified('documents');
        s.markModified('previousEducation');
        await s.save();
      }
    }
    console.log('Updated Students');

    // 2. Teachers
    const teachers = await Teacher.find({});
    for (let t of teachers) {
      if (t.profileImage) {
        t.profileImage = fixPath(t.profileImage, 'teacher', 'profile');
        await t.save();
      }
    }
    console.log('Updated Teachers');

    // 3. Staff
    const staff = await Staff.find({});
    for (let st of staff) {
      if (st.profileImage) {
        st.profileImage = fixPath(st.profileImage, 'staff', 'profile');
        await st.save();
      }
    }
    console.log('Updated Staff');

    // 4. Notices
    const notices = await Notice.find({});
    for (let n of notices) {
      let changed = false;
      if (n.attachments && Array.isArray(n.attachments)) {
        n.attachments = n.attachments.map(a => fixPath(a, 'admin', 'notices'));
        changed = true;
      }
      if (changed) {
        n.markModified('attachments');
        await n.save();
      }
    }
    console.log('Updated Notices');

    // ... (Diary, Resources)

    // 7. Digital Library
    const books = await DigitalLibrary.find({});
    for (let b of books) {
      if (b.fileUrl) {
        b.fileUrl = fixPath(b.fileUrl, 'library', 'digital');
        await b.save();
      }
    }
    console.log('Updated Digital Library');

    // 8. Warden
    const wardens = await Warden.find({});
    for (let w of wardens) {
      if (w.profileImage) {
        w.profileImage = fixPath(w.profileImage, 'warden', 'profile');
        await w.save();
      }
    }
    console.log('Updated Wardens');

    console.log('DB Migration Complete!');
  } catch (err) {
    console.error('Error during migration:', err);
  } finally {
    process.exit(0);
  }
}

connect().then(updateFilePaths).catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
