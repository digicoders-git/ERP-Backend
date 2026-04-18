const mongoose = require('mongoose');
require('dotenv').config();

const VideoClass = require('../model/VideoClass');
const Class = require('../model/Class');
const Section = require('../model/Section');
const Branch = require('../model/Branch');
const Client = require('../model/Client');
const Admin = require('../model/Admin');

async function seedRecordedVideos() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/erp-school');
    console.log('Connected to MongoDB');

    // Get existing data
    let branch = await Branch.findOne();
    let client = await Client.findOne();
    let admin = await Admin.findOne();
    let cls = await Class.findOne();
    let section = await Section.findOne();

    if (!branch || !client || !admin) {
      console.log('ERROR: Branch, Client, or Admin not found in database');
      console.log(`Branch: ${branch?._id}, Client: ${client?._id}, Admin: ${admin?._id}`);
      await mongoose.connection.close();
      return;
    }

    if (!cls) {
      cls = await Class.create({
        className: '10A',
        branch: branch._id,
        client: client._id
      });
      console.log('Created class:', cls._id);
    }

    if (!section) {
      section = await Section.create({
        sectionName: 'A',
        branch: branch._id,
        client: client._id
      });
      console.log('Created section:', section._id);
    }

    // Create sample recorded videos
    const videos = [
      {
        title: 'Introduction to Mathematics',
        subject: 'Mathematics',
        duration: '45',
        thumbnailUrl: 'https://via.placeholder.com/320x180?text=Math+Intro',
        videoUrl: 'https://example.com/videos/math-intro.mp4',
        class: cls._id,
        section: section._id,
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
        class: cls._id,
        section: section._id,
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
        class: cls._id,
        section: section._id,
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
        class: cls._id,
        section: section._id,
        branch: branch._id,
        client: client._id,
        createdBy: admin._id,
        views: 15
      }
    ];

    // Clear existing videos
    await VideoClass.deleteMany({});
    console.log('Cleared existing videos');

    // Insert new videos
    const created = await VideoClass.insertMany(videos);
    console.log(`\nCreated ${created.length} recorded videos:`);
    created.forEach((v, idx) => {
      console.log(`${idx + 1}. ${v.title} (${v.subject})`);
    });

    await mongoose.connection.close();
    console.log('\nConnection closed');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

seedRecordedVideos();
