const mongoose = require('mongoose');
require('dotenv').config();

const Plan = require('../model/Plan');
const Client = require('../model/Client');
const Branch = require('../model/Branch');
const Admin = require('../model/Admin');
const Class = require('../model/Class');
const Section = require('../model/Section');
const Student = require('../model/Student');
const ParentStudent = require('../model/ParentStudent');
const VideoClass = require('../model/VideoClass');
const LiveClass = require('../model/LiveClass');

async function setup() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/erp-school');
    console.log('Connected\n');

    let plan = await Plan.findOne();
    if (!plan) {
      plan = await Plan.create({
        planName: 'Premium',
        planType: 'Monthly Fixed Price',
        monthlyPrice: 5000,
        panelsIncluded: ['school', 'staff', 'fee', 'warden', 'library', 'transport', 'teacher', 'parent', 'student'],
        maxBranches: 5
      });
      console.log('✓ Plan');
    }

    let client = await Client.findOne();
    if (!client) {
      client = await Client.create({
        name: 'Test School',
        phone: '9876543210',
        plan: plan._id,
        purchasedPanels: ['school', 'staff', 'fee', 'warden', 'library', 'transport', 'teacher', 'parent', 'student'],
        maxBranches: 5
      });
      console.log('✓ Client');
    }

    let admin = await Admin.findOne({ role: 'clientAdmin' });
    if (!admin) {
      admin = await Admin.create({
        name: 'Admin',
        email: 'admin@test.com',
        password: 'admin123',
        role: 'clientAdmin',
        client: client._id,
        allowedPanels: ['school', 'staff', 'fee', 'warden', 'library', 'transport', 'teacher', 'parent', 'student']
      });
      console.log('✓ Admin');
    }

    let branch = await Branch.findOne();
    if (!branch) {
      branch = await Branch.create({
        branchName: 'Main',
        branchCode: 'MAIN001',
        client: client._id,
        createdBy: admin._id
      });
      console.log('✓ Branch');
    }

    let classes = await Class.find();
    if (classes.length === 0) {
      classes = await Class.insertMany([
        { 
          className: '10A', 
          classCode: 'CLS10A',
          classCapacity: 50,
          branch: branch._id, 
          client: client._id,
          createdBy: admin._id
        }
      ]);
      console.log('✓ Class');
    }

    let sections = await Section.find();
    if (sections.length === 0) {
      sections = await Section.insertMany([
        { 
          sectionName: 'A', 
          assignToClass: classes[0]._id,
          capacity: 50,
          branch: branch._id, 
          client: client._id,
          createdBy: admin._id
        }
      ]);
      console.log('✓ Section');
    }

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
          client: client._id
        }
      ]);
      console.log('✓ Student');
    } else {
      students = await Student.find().limit(1);
    }

    let parent = await ParentStudent.findOne({ role: 'parent' });
    if (!parent) {
      parent = await ParentStudent.create({
        firstName: 'Parent',
        lastName: 'User',
        mobile: '9876543210',
        password: 'password123',
        role: 'parent',
        children: [{
          studentId: students[0]._id,
          name: students[0].firstName + ' ' + students[0].lastName,
          class: students[0].class,
          section: students[0].section,
          rollNo: students[0].rollNumber
        }],
        branch: branch._id,
        client: client._id
      });
      console.log('✓ Parent');
    }

    let videos = await VideoClass.find();
    if (videos.length === 0) {
      videos = await VideoClass.insertMany([
        {
          title: 'Math Intro',
          subject: 'Mathematics',
          duration: '45',
          thumbnailUrl: 'https://via.placeholder.com/320x180',
          videoUrl: 'https://example.com/math.mp4',
          class: classes[0]._id,
          section: sections[0]._id,
          branch: branch._id,
          client: client._id,
          createdBy: admin._id
        },
        {
          title: 'English Grammar',
          subject: 'English',
          duration: '38',
          thumbnailUrl: 'https://via.placeholder.com/320x180',
          videoUrl: 'https://example.com/english.mp4',
          class: classes[0]._id,
          section: sections[0]._id,
          branch: branch._id,
          client: client._id,
          createdBy: admin._id
        }
      ]);
      console.log('✓ Videos');
    }

    let liveClasses = await LiveClass.find();
    if (liveClasses.length === 0) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      liveClasses = await LiveClass.insertMany([
        {
          title: 'Live Math',
          subject: 'Mathematics',
          meetLink: 'https://meet.google.com/abc',
          date: tomorrow,
          duration: '60',
          class: classes[0]._id,
          section: sections[0]._id,
          branch: branch._id,
          client: client._id,
          createdBy: admin._id,
          status: 'Scheduled'
        }
      ]);
      console.log('✓ Live Classes');
    }

    console.log('\n✓ SETUP COMPLETE!');
    console.log('Mobile: 9876543210');
    console.log('Password: password123');

    await mongoose.connection.close();
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

setup();
