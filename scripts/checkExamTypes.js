require('dotenv').config();
const mongoose = require('mongoose');
const ExamType = require('../model/ExamType');
const MarksheetTemplate = require('../model/MarksheetTemplate');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/erp-school');
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const checkData = async () => {
  try {
    console.log('\n=== CHECKING EXAM TYPES ===');
    const examTypes = await ExamType.find()
      .populate('branch', 'branchName')
      .populate('client', 'clientName')
      .populate('marksheetTemplate', 'templateName');
    
    console.log(`Total Exam Types: ${examTypes.length}`);
    if (examTypes.length > 0) {
      console.log('\nExam Types:');
      examTypes.forEach((et, i) => {
        console.log(`${i + 1}. ${et.examTypeName} (${et.examTypeCode})`);
        console.log(`   Branch: ${et.branch?.branchName || 'N/A'}`);
        console.log(`   Client: ${et.client?.clientName || 'N/A'}`);
        console.log(`   Marksheet: ${et.marksheetTemplate?.templateName || 'None'}`);
        console.log(`   Status: ${et.status}`);
      });
    } else {
      console.log('No exam types found in database');
    }

    console.log('\n=== CHECKING MARKSHEET TEMPLATES ===');
    const templates = await MarksheetTemplate.find()
      .populate('branch', 'branchName')
      .populate('client', 'clientName');
    
    console.log(`Total Marksheet Templates: ${templates.length}`);
    if (templates.length > 0) {
      console.log('\nMarksheet Templates:');
      templates.forEach((t, i) => {
        console.log(`${i + 1}. ${t.templateName}`);
        console.log(`   Branch: ${t.branch?.branchName || 'N/A'}`);
        console.log(`   Client: ${t.client?.clientName || 'N/A'}`);
        console.log(`   File Type: ${t.fileType}`);
        console.log(`   Status: ${t.status}`);
      });
    } else {
      console.log('No marksheet templates found in database');
    }

    console.log('\n=== SUMMARY ===');
    console.log(`Exam Types: ${examTypes.length}`);
    console.log(`Marksheet Templates: ${templates.length}`);

  } catch (error) {
    console.error('Error checking data:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
};

connectDB().then(() => checkData());
