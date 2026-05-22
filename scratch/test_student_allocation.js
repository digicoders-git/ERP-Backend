const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

// Register Models
require('../model/Branch');
require('../model/Client');
require('../model/Hostel');
require('../model/Student');
require('../model/HostelAllocation');
require('../model/Admin');
require('../model/Staff');

const hostelController = require('../controller/staff/hostelController');

async function runTests() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ERP');
    console.log('Connected.');

    // Fetch a real Admin or Staff user dynamically from the database
    const Admin = mongoose.model('Admin');
    const Staff = mongoose.model('Staff');
    
    // Attempt to find an admin with a branch, fallback to any admin
    let dbUser = await Admin.findOne({ branch: { $ne: null } });
    if (!dbUser) dbUser = await Staff.findOne({ branch: { $ne: null } });
    if (!dbUser) dbUser = await Admin.findOne();
    if (!dbUser) dbUser = await Staff.findOne();
    
    if (!dbUser) {
      console.log('❌ Error: No admin or staff user found in database. Please run seeding or migration first.');
      process.exit(1);
    }
    
    const mockAdminId = dbUser._id.toString();
    console.log(`Using mock admin/staff ID from DB: ${mockAdminId} (role: ${dbUser.role || 'staff'}, original branch: ${dbUser.branch ? dbUser.branch.toString() : 'null'})`);

    // Fetch Amit Patel
    const Student = mongoose.model('Student');
    const student = await Student.findOne({ firstName: 'Amit' });
    if (!student) {
      console.log('❌ Error: Could not find seeded student Amit in DB.');
      process.exit(1);
    }

    console.log(`Found student: ${student.firstName} ${student.lastName} with ID: ${student.admissionNumber || student._id.toString()}, branch: ${student.branch ? student.branch.toString() : 'none'}`);

    // If the mock admin has a different or null branch, temporarily align them in the database for the test
    if (student.branch && (!dbUser.branch || dbUser.branch.toString() !== student.branch.toString())) {
      console.log(`Aligning mock admin's branch to student's branch ${student.branch.toString()}...`);
      await Admin.findByIdAndUpdate(mockAdminId, { branch: student.branch });
      // Reload admin
      dbUser = await Admin.findById(mockAdminId);
    }

    // Test Case 1: Non-existent student ID
    console.log('\n--- Test Case 1: Allocating to a non-existent student ID ---');
    let responseStatus = null;
    let responseJson = null;

    const mockReq1 = {
      userId: mockAdminId,
      body: {
        studentId: 'NON_EXISTENT_STUDENT_ID',
        hostel: '69d754be449b1d1038210275',
        roomNo: '999',
        joiningDate: new Date(),
        monthlyRent: 5000,
        securityDeposit: 1000,
        remark: 'Test'
      }
    };

    const mockRes1 = {
      status: function(code) {
        responseStatus = code;
        return this;
      },
      json: function(data) {
        responseJson = data;
        return this;
      }
    };

    await hostelController.createAllocation(mockReq1, mockRes1);

    console.log('Response Status:', responseStatus);
    console.log('Response JSON:', responseJson);

    if (responseStatus === 400 && responseJson && responseJson.message === 'Student not found in institutional database.') {
      console.log('✅ Test Case 1 PASSED: Correctly blocked and returned 400 with "Student not found in institutional database."');
    } else {
      console.log('❌ Test Case 1 FAILED: Incorrect response for non-existent student');
    }

    // Test Case 2: Seeded active student
    console.log('\n--- Test Case 2: Allocating to a valid seeded student ---');
    const mockReq2 = {
      userId: mockAdminId,
      body: {
        studentId: student.admissionNumber || student._id.toString(),
        hostel: '69d754be449b1d1038210275',
        roomNo: '103',
        joiningDate: new Date(),
        monthlyRent: 8000,
        securityDeposit: 2000,
        remark: 'Test Seeded'
      }
    };

    let responseStatus2 = null;
    let responseJson2 = null;

    const mockRes2 = {
      status: function(code) {
        responseStatus2 = code;
        return this;
      },
      json: function(data) {
        responseJson2 = data;
        return this;
      }
    };

    await hostelController.createAllocation(mockReq2, mockRes2);

    console.log('Response Status:', responseStatus2);
    console.log('Response JSON:', responseJson2);

    if (responseStatus2 === 201 || (responseStatus2 === 400 && responseJson2.message && responseJson2.message.includes('already allocated'))) {
      console.log('✅ Test Case 2 PASSED: Validation passed successfully (reached allocation step or detected existing allocation correctly).');
    } else {
      console.log('❌ Test Case 2 FAILED: Validation did not process correctly.');
    }

    mongoose.disconnect();
    console.log('\nTests completed.');
  } catch (err) {
    console.error('Test script crashed:', err);
    process.exit(1);
  }
}

runTests();
