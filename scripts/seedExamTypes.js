require('dotenv').config();
const mongoose = require('mongoose');
const ExamType = require('../model/ExamType');
const MarksheetTemplate = require('../model/MarksheetTemplate');
const Branch = require('../model/Branch');
const Client = require('../model/Client');
const Admin = require('../model/Admin');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/erp-school');
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const seedData = async () => {
  try {
    // Get first branch and client
    const branch = await Branch.findOne();
    const client = await Client.findOne();
    const admin = await Admin.findOne();

    if (!branch) {
      console.log('No branch found. Please create a branch first.');
      return;
    }

    if (!client) {
      console.log('No client found. Please create a client first.');
      return;
    }

    if (!admin) {
      console.log('No admin found. Please create an admin first.');
      return;
    }

    console.log(`Using Branch: ${branch.branchName}`);
    console.log(`Using Client: ${client.clientName}`);
    console.log(`Using Admin: ${admin.email}`);

    // Create Marksheet Templates
    console.log('\n=== Creating Marksheet Templates ===');
    const templates = [
      {
        templateName: 'Standard Marksheet',
        templateFile: '/templates/standard-marksheet.pdf',
        fileType: 'pdf',
        description: 'Standard marksheet template for all exams',
        branch: branch._id,
        client: client._id,
        createdBy: admin._id,
        status: true
      },
      {
        templateName: 'Board Exam Marksheet',
        templateFile: '/templates/board-marksheet.pdf',
        fileType: 'pdf',
        description: 'Marksheet template for board exams',
        branch: branch._id,
        client: client._id,
        createdBy: admin._id,
        status: true
      }
    ];

    const createdTemplates = await MarksheetTemplate.insertMany(templates);
    console.log(`Created ${createdTemplates.length} marksheet templates`);

    // Create Exam Types
    console.log('\n=== Creating Exam Types ===');
    const examTypes = [
      {
        examTypeName: 'Unit Test',
        examTypeCode: 'UT-001',
        description: 'Unit test for students',
        marksheetTemplate: createdTemplates[0]._id,
        totalMarks: 50,
        passingMarks: 20,
        branch: branch._id,
        client: client._id,
        createdBy: admin._id,
        status: true
      },
      {
        examTypeName: 'Mid Term',
        examTypeCode: 'MT-001',
        description: 'Mid term examination',
        marksheetTemplate: createdTemplates[0]._id,
        totalMarks: 100,
        passingMarks: 40,
        branch: branch._id,
        client: client._id,
        createdBy: admin._id,
        status: true
      },
      {
        examTypeName: 'Final',
        examTypeCode: 'FN-001',
        description: 'Final examination',
        marksheetTemplate: createdTemplates[0]._id,
        totalMarks: 100,
        passingMarks: 40,
        branch: branch._id,
        client: client._id,
        createdBy: admin._id,
        status: true
      },
      {
        examTypeName: 'Board',
        examTypeCode: 'BD-001',
        description: 'Board examination',
        marksheetTemplate: createdTemplates[1]._id,
        totalMarks: 100,
        passingMarks: 33,
        branch: branch._id,
        client: client._id,
        createdBy: admin._id,
        status: true
      }
    ];

    const createdExamTypes = await ExamType.insertMany(examTypes);
    console.log(`Created ${createdExamTypes.length} exam types`);

    console.log('\n=== SEED COMPLETE ===');
    console.log(`Marksheet Templates: ${createdTemplates.length}`);
    console.log(`Exam Types: ${createdExamTypes.length}`);

  } catch (error) {
    console.error('Seed error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
};

connectDB().then(() => seedData());
