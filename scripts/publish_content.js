const mongoose = require('mongoose');
require('dotenv').config();

// Models
const Notice = require('../model/Notice');
const LiveClass = require('../model/LiveClass');
const VideoClass = require('../model/VideoClass');
const Diary = require('../model/Diary');

async function publish() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ERP');
    console.log('Connected to DB');

    // 1. Publish all Existing Notices
    console.log('Publishing all Notices...');
    const noticeResult = await Notice.updateMany(
      { isPublished: false },
      { $set: { isPublished: true, publishDate: new Date() } }
    );
    console.log(`Updated ${noticeResult.modifiedCount} notices.`);

    // 2. Check for Live Classes without status
    console.log('Ensuring Live Classes have status...');
    const liveResult = await LiveClass.updateMany(
      { status: { $exists: false } },
      { $set: { status: 'Scheduled' } }
    );
    console.log(`Updated ${liveResult.modifiedCount} live classes.`);

    console.log('Activation Completed Successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Activation Error:', err);
    process.exit(1);
  }
}

publish();
