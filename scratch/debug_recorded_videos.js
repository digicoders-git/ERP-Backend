const mongoose = require('mongoose');
require('dotenv').config();

const VideoClass = require('../model/VideoClass');

async function debugVideos() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/erp-school');
    console.log('Connected to MongoDB');

    // Count total videos
    const totalCount = await VideoClass.countDocuments();
    console.log('\n=== TOTAL VIDEOS ===');
    console.log(`Total VideoClass records: ${totalCount}`);

    // Get all videos with details
    const allVideos = await VideoClass.find()
      .populate('class', 'className')
      .populate('section', 'sectionName')
      .populate('createdBy', 'name')
      .lean();

    console.log('\n=== ALL VIDEOS ===');
    allVideos.forEach((v, idx) => {
      console.log(`\n${idx + 1}. ${v.title}`);
      console.log(`   Subject: ${v.subject}`);
      console.log(`   Class: ${v.class?.className || 'NULL'} (ID: ${v.class})`);
      console.log(`   Section: ${v.section?.sectionName || 'NULL'} (ID: ${v.section})`);
      console.log(`   Branch: ${v.branch}`);
      console.log(`   Client: ${v.client}`);
      console.log(`   Teacher: ${v.createdBy?.name || 'NULL'}`);
      console.log(`   Video URL: ${v.videoUrl ? 'YES' : 'NO'}`);
      console.log(`   Thumbnail: ${v.thumbnailUrl ? 'YES' : 'NO'}`);
    });

    // Group by class
    console.log('\n=== VIDEOS BY CLASS ===');
    const byClass = {};
    allVideos.forEach(v => {
      const className = v.class?.className || 'NO_CLASS';
      if (!byClass[className]) byClass[className] = 0;
      byClass[className]++;
    });
    Object.entries(byClass).forEach(([cls, count]) => {
      console.log(`${cls}: ${count} videos`);
    });

    // Group by branch
    console.log('\n=== VIDEOS BY BRANCH ===');
    const byBranch = {};
    allVideos.forEach(v => {
      const branchId = v.branch?.toString() || 'NO_BRANCH';
      if (!byBranch[branchId]) byBranch[branchId] = 0;
      byBranch[branchId]++;
    });
    Object.entries(byBranch).forEach(([branch, count]) => {
      console.log(`${branch}: ${count} videos`);
    });

    await mongoose.connection.close();
    console.log('\nConnection closed');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

debugVideos();
