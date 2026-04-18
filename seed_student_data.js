const mongoose = require('mongoose');
require('dotenv').config();

// Register Models
require('./model/Branch');
require('./model/Client');
require('./model/Hostel');
require('./model/Student');
require('./model/HostelAllocation');
require('./model/Admin');

const Student = mongoose.model('Student');
const HostelAllocation = mongoose.model('HostelAllocation');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ERP');
    console.log('Connected to DB');

    const branchId = "69d61d2fa9c89eaa23b68dec";
    const clientId = "69d600eab45ba5f7c0137cf6";
    const hostelId = "69d754be449b1d1038210275";
    const adminId = "69d60004b45ba5f7c0137c97";

    const commonData = {
      branch: branchId,
      client: clientId,
      createdBy: adminId,
      status: 'active',
      applicationStatus: 'enrolled',
      admissionStatus: 'confirmed',
      hasPreviousEducation: 'no',
      currentAddress: { address: 'Delhi', city: 'Delhi', state: 'Delhi', pincode: '110001' },
      permanentAddress: { address: 'Delhi', city: 'Delhi', state: 'Delhi', pincode: '110001' },
      guardianInfo: { fatherName: 'Father', motherName: 'Mother', guardianPhone: '9999999999', emergencyPhone: '9999999998' }
    };

    const students = [
      { firstName: 'Rahul', lastName: 'Sharma', rollNumber: 'CS101', email: 'rahul@example.com', phone: '9876543210', gender: 'male', dob: '2008-05-15', category: 'general', ...commonData },
      { firstName: 'Priya', lastName: 'Verma', rollNumber: 'EC102', email: 'priya@example.com', phone: '8765432109', gender: 'female', dob: '2009-08-22', category: 'general', ...commonData },
      { firstName: 'Amit', lastName: 'Patel', rollNumber: 'ME103', email: 'amit@example.com', phone: '7654321098', gender: 'male', dob: '2008-03-10', category: 'general', ...commonData },
      { firstName: 'Sneha', lastName: 'Gupta', rollNumber: 'CS204', email: 'sneha@example.com', phone: '6543210987', gender: 'female', dob: '2010-11-05', category: 'general', ...commonData },
      { firstName: 'Vikram', lastName: 'Singh', rollNumber: 'CE205', email: 'vikram@example.com', phone: '5432109876', gender: 'male', dob: '2009-01-20', category: 'general', ...commonData }
    ];

    console.log('Inserting Students...');
    const createdStudents = [];
    for (const s of students) {
      let existing = await Student.findOne({ rollNumber: s.rollNumber });
      if (!existing) {
        existing = await Student.create(s);
        console.log(`Created Student: ${s.firstName}`);
      }
      createdStudents.push(existing);
    }

    console.log('Creating Allocations...');
    const roomNos = ['101', '102', '102', '202', '202'];
    for (let i = 0; i < createdStudents.length; i++) {
      const student = createdStudents[i];
      const existingAlloc = await HostelAllocation.findOne({ studentId: student._id.toString(), allocationStatus: 'allocated' });
      
      if (!existingAlloc) {
        await HostelAllocation.create({
          studentId: student._id.toString(),
          studentName: `${student.firstName} ${student.lastName}`,
          hostel: hostelId,
          roomNo: roomNos[i],
          joiningDate: new Date(),
          monthlyRent: 8000,
          securityDeposit: 2000,
          allocationStatus: 'allocated',
          branch: branchId,
          client: clientId,
          createdBy: adminId
        });
        console.log(`Allocated student: ${student.firstName} to room ${roomNos[i]}`);
      }
    }

    console.log('Seeding successful!');
    process.exit();
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seed();
