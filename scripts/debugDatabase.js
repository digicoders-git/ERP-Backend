require('dotenv').config();
const mongoose = require('mongoose');
const ExamType = require('../model/ExamType');
const MarksheetTemplate = require('../model/MarksheetTemplate');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/erp-school');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const checkDatabase = async () => {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('DATABASE CHECK - Exam Types और Marksheet Templates');
    console.log('='.repeat(60));

    // Check ExamType collection
    console.log('\n📋 EXAMTYPE COLLECTION:');
    const examTypeCount = await ExamType.countDocuments();
    console.log(`Total Documents: ${examTypeCount}`);

    if (examTypeCount > 0) {
      const examTypes = await ExamType.find()
        .populate('branch', 'branchName')
        .populate('client', 'clientName')
        .populate('marksheetTemplate', 'templateName')
        .lean();

      console.log('\nExam Types:');
      examTypes.forEach((et, i) => {
        console.log(`\n${i + 1}. ${et.examTypeName}`);
        console.log(`   Code: ${et.examTypeCode}`);
        console.log(`   Branch: ${et.branch?.branchName || 'N/A'}`);
        console.log(`   Client: ${et.client?.clientName || 'N/A'}`);
        console.log(`   Total Marks: ${et.totalMarks}`);
        console.log(`   Passing Marks: ${et.passingMarks}`);
        console.log(`   Marksheet: ${et.marksheetTemplate?.templateName || 'None'}`);
        console.log(`   Status: ${et.status}`);
        console.log(`   Created: ${new Date(et.createdAt).toLocaleString()}`);
      });
    } else {
      console.log('❌ No exam types found in database');
    }

    // Check MarksheetTemplate collection
    console.log('\n' + '-'.repeat(60));
    console.log('\n📄 MARKSHEETTEMPLATE COLLECTION:');
    const templateCount = await MarksheetTemplate.countDocuments();
    console.log(`Total Documents: ${templateCount}`);

    if (templateCount > 0) {
      const templates = await MarksheetTemplate.find()
        .populate('branch', 'branchName')
        .populate('client', 'clientName')
        .lean();

      console.log('\nMarksheet Templates:');
      templates.forEach((t, i) => {
        console.log(`\n${i + 1}. ${t.templateName}`);
        console.log(`   File Type: ${t.fileType}`);
        console.log(`   File Size: ${t.fileSize} bytes`);
        console.log(`   Branch: ${t.branch?.branchName || 'N/A'}`);
        console.log(`   Client: ${t.client?.clientName || 'N/A'}`);
        console.log(`   Status: ${t.status}`);
        console.log(`   Created: ${new Date(t.createdAt).toLocaleString()}`);
      });
    } else {
      console.log('❌ No marksheet templates found in database');
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY:');
    console.log(`Exam Types: ${examTypeCount}`);
    console.log(`Marksheet Templates: ${templateCount}`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✅ Database connection closed\n');
  }
};

connectDB().then(() => checkDatabase());
