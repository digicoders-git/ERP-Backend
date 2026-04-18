const mongoose = require('mongoose');
const path = require('path');

// Load environment variables from parent directory
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Salary = require('../model/Salary');
const Teacher = require('../model/Teacher');

const fixSalaryRecords = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    
    if (!mongoUri) {
      console.error('Error: MONGODB_URI not found in .env file');
      process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Get all salary records
    const salaries = await Salary.find({});
    console.log(`Found ${salaries.length} salary records\n`);

    let updated = 0;
    let failed = 0;

    for (const salary of salaries) {
      try {
        // If teacher ID is missing or invalid, find it from teacher name
        if (!salary.teacher || !mongoose.Types.ObjectId.isValid(salary.teacher)) {
          const teacher = await Teacher.findOne({ name: salary.teacherName });
          
          if (teacher) {
            salary.teacher = teacher._id;
            await salary.save();
            console.log(`✓ Updated salary for ${salary.teacherName} (${salary.month})`);
            updated++;
          } else {
            console.log(`✗ Teacher not found: ${salary.teacherName}`);
            failed++;
          }
        } else {
          console.log(`- Salary already has teacher ID: ${salary.teacherName}`);
        }
      } catch (err) {
        console.error(`✗ Error processing salary ${salary._id}:`, err.message);
        failed++;
      }
    }

    console.log(`\n========== Migration Complete ==========`);
    console.log(`Updated: ${updated}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total: ${salaries.length}`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error.message);
    process.exit(1);
  }
};

fixSalaryRecords();
