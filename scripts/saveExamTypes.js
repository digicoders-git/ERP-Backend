const mongoose = require('mongoose');
const ClientSettings = require('../model/ClientSettings');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ERP';

async function saveExamTypesToDatabase() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Get all branches
    const Branch = require('../model/Branch');
    const branches = await Branch.find().limit(100);
    console.log(`Found ${branches.length} branches`);

    // For each branch, ensure ClientSettings exists with exam types
    for (const branch of branches) {
      const branchId = branch._id;
      const clientId = branchId; // Use branchId as clientId

      let settings = await ClientSettings.findOne({
        branchId: branchId,
        client: clientId
      });

      if (!settings) {
        settings = new ClientSettings({
          branchId: branchId,
          client: clientId,
          marksheet: {
            examTypes: [
              {
                _id: new mongoose.Types.ObjectId(),
                name: 'Mid Term',
                code: 'MID-TERM',
                description: 'Mid term examination',
                isActive: true
              },
              {
                _id: new mongoose.Types.ObjectId(),
                name: 'Final Exam',
                code: 'FINAL',
                description: 'Final examination',
                isActive: true
              },
              {
                _id: new mongoose.Types.ObjectId(),
                name: 'Unit Test',
                code: 'UNIT-TEST',
                description: 'Unit test examination',
                isActive: true
              }
            ]
          }
        });

        try {
          await settings.save();
          console.log(`✓ Created exam types for branch: ${branch.branchName} (${branchId})`);
        } catch (err) {
          if (err.code === 11000) {
            console.log(`✓ Exam types already exist for branch: ${branch.branchName}`);
          } else {
            console.error(`✗ Error saving for branch ${branch.branchName}:`, err.message);
          }
        }
      } else {
        console.log(`✓ Exam types already exist for branch: ${branch.branchName}`);
      }
    }

    console.log('\n✓ All exam types saved to database successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

saveExamTypesToDatabase();
