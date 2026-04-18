const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const Client = require('../model/Client');
const Branch = require('../model/Branch');
const Admin = require('../model/Admin');
const Class = require('../model/Class');
const Section = require('../model/Section');
const Student = require('../model/Student');
const ParentStudent = require('../model/ParentStudent');
const VideoClass = require('../model/VideoClass');
const LiveClass = require('../model/LiveClass');

async function setupCompleteData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/erp-school');
    console.log('✓ Connected to MongoDB\n');

    // 1. Create Client
    console.log('Creating Client...');
    let client = await Client.findOne();
    if (!client) {
      client = await Client.create({
        clientName: 'Test School',
        email: 'school@test.com',
        phone: '9876543210'
      });
      console.log('✓ Client created:', client._id);
    } else {
      console.log('✓ Client already exists:', client._id);
    }

    // 2. Create Branch
    console.log('\nCreating Branch...');
    let branch = await Branch.findOne();
    if (!branch) {
      branch = await Branch.create({
        branchName: 'Main Campus',
        branchCode: 'MAIN001',
        address: 'Main Street, City',
        client: client._id,
        createdBy: null // Will update after creating admin
      });
      console.log('✓ Branch created:', branch._id);
    } else {
      console.log('✓ Branch already exists:', branch._id);
    }

    // 3. Create Admin
    console.log('\nCreating Admin...');
    let admin = await Admin.findOne({ role: 'admin' });
    if (!admin) {
      admin = await Admin.create({
        name: 'Admin User',
        email: 'admin@test.com',
        password: await bcrypt.hash('admin123', 10),
        role: 'admin',
        branch: branch._id,
        client: client._id
      });
      console.log('✓ Admin created:', admin._id);
      
      // Update branch with admin
      branch.createdBy = admin._id;
      await branch.save();
    } else {
      console.log('✓ Admin already exists:', admin._id);
    }

    // 4. Create Classes
    console.log('\nCreating Classes...');
    let classes = await Class.find();
    if (classes.length === 0) {
      const classNames = ['10A', '10B', '11A', '11B'];
      classes = await Class.insertMany(
        classNames.map(name => ({
          className: name,
          branch: branch._id,
          client: client._id
        }))
      );
      console.log('✓ Classes created:', classes.length);
    } else {
      console.log('✓ Classes already exist:', classes.length);
    }

    // 5. Create Sections
    console.log('\nCreating Sections...');
    let sections = await Section.find();
    if (sections.length === 0) {
      const sectionNames = ['A', 'B', 'C'];
      sections = await Section.insertMany(
        sectionNames.map(name => ({
          sectionName: name,
          branch: branch._id,
          client: client._id
        }))
      );
      console.log('✓ Sections created:', sections.length);
    } else {
      console.log('✓ Sections already exist:', sections.length);
    }

    // 6. Create Students
    console.log('\nCreating Students...');
    let students = await Student.find();
    if (students.length === 0) {
      students = await Student.insertMany([
        {
          firstName: 'Raj',
          lastName: 'Kumar',
          admissionNumber: 'ADM001',
          rollNumber: '1',
          dob: new Date('2008-05-15'),
          gender: 'Male',
          email: 'raj@test.com',
          phone: '9876543210',
          class: classes[0]._id,
          section: sections[0]._id,
          branch: branch._id,
          client: client._id,
          status: 'active'
        },
        {
          firstName: 'Priya',
          lastName: 'Singh',
          admissionNumber: 'ADM002',
          rollNumber: '2',
          dob: new Date('2008-06-20'),
          gender: 'Female',
          email: 'priya@test.com',
          phone: '9876543211',
          class: classes[0]._id,
          section: sections[0]._id,
          branch: branch._id,
          client: client._id,
          status: 'active'
        }
      ]);
      console.log('✓ Students created:', students.length);
    } else {
      console.log('✓ Students already exist:', students.length);
      students = await Student.find().limit(2);
    }

    // 7. Create Parent/Student User
    console.log('\nCreating Parent User...');
    let parentUser = await ParentStudent.findOne({ role: 'parent' });
    if (!parentUser) {
      parentUser = await ParentStudent.create({
        firstName: 'Parent',
        lastName: 'User',
        mobile: '9876543210',
        password: await bcrypt.hash('password123', 10),
        role: 'parent',
        children: [
          {
            studentId: students[0]._id,
            name: `${students[0].firstName} ${students[0].lastName}`,
            class: students[0].class,
            section: students[0].section,
            rollNo: students[0].rollNumber
          }
        ],
        branch: branch._id,
        client: client._id,
        status: true
      });
      console.log('✓ Parent user created:', parentUser._id);
    } else {
      console.log('✓ Parent user already exists:', parentUser._id);
    }

    // 8. Create Recorded Videos
    console.log('\nCreating Recorded Videos...');
    let videos = await VideoClass.find();
    if (videos.length === 0) {
      videos = await VideoClass.insertMany([
        {
          title: 'Introduction to Mathematics',
          subject: 'Mathematics',
          duration: '45',
          thumbnailUrl: 'https://via.placeholder.com/320x180?text=Math+Intro',
          videoUrl: 'https://example.com/videos/math-intro.mp4',
          class: classes[0]._id,
          section: sections[0]._id,
          branch: branch._id,
          client: client._id,
          createdBy: admin._id,
          views: 25
        },
        {
          title: 'English Grammar Basics',
          subject: 'English',
          duration: '38',
          thumbnailUrl: 'https://via.placeholder.com/320x180?text=English+Grammar',
          videoUrl: 'https://example.com/videos/english-grammar.mp4',
          class: classes[0]._id,
          section: sections[0]._id,
          branch: branch._id,
          client: client._id,
          createdBy: admin._id,
          views: 18
        },
        {
          title: 'Science Experiments',
          subject: 'Science',
          duration: '52',
          thumbnailUrl: 'https://via.placeholder.com/320x180?text=Science+Exp',
          videoUrl: 'https://example.com/videos/science-exp.mp4',
          class: classes[0]._id,
          section: sections[0]._id,
          branch: branch._id,
          client: client._id,
          createdBy: admin._id,
          views: 32
        },
        {
          title: 'History of India',
          subject: 'History',
          duration: '41',
          thumbnailUrl: 'https://via.placeholder.com/320x180?text=History',
          videoUrl: 'https://example.com/videos/history.mp4',
          class: classes[0]._id,
          section: sections[0]._id,
          branch: branch._id,
          client: client._id,
          createdBy: admin._id,
          views: 15
        }
      ]);
      console.log('✓ Recorded videos created:', videos.length);
    } else {
      console.log('✓ Recorded videos already exist:', videos.length);
    }

    // 9. Create Live Classes
    console.log('\nCreating Live Classes...');
    let liveClasses = await LiveClass.find();
    if (liveClasses.length === 0) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      liveClasses = await LiveClass.insertMany([
        {
          title: 'Live Math Class',
          subject: 'Mathematics',
          meetLink: 'https://meet.google.com/abc-defg-hij',
          date: tomorrow,
          duration: '60',
          class: classes[0]._id,
          section: sections[0]._id,
          branch: branch._id,
          client: client._id,
          createdBy: admin._id,
          status: 'Scheduled'
        },
        {
          title: 'Live English Class',
          subject: 'English',
          meetLink: 'https://meet.google.com/xyz-uvwx-yz',
          date: tomorrow,
          duration: '45',
          class: classes[0]._id,
          section: sections[0]._id,
          branch: branch._id,
          client: client._id,
          createdBy: admin._id,
          status: 'Scheduled'
        }
      ]);
      console.log('✓ Live classes created:', liveClasses.length);
    } else {
      console.log('✓ Live classes already exist:', liveClasses.length);
    }

    console.log('\n' + '='.repeat(50));
    console.log('✓ SETUP COMPLETE!');
    console.log('='.repeat(50));
    console.log('\nLogin Credentials:');
    console.log('Mobile: 9876543210');
    console.log('Password: password123');
    console.log('Role: parent');
    console.log('\nYou can now test the APIs!');

    await mongoose.connection.close();
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

setupCompleteData();
