const mongoose = require('mongoose');
require('dotenv').config();

// Models
const FeeCollection = require('../model/FeeCollection');
const Assignment = require('../model/Assignment');
const AssignmentSubmission = require('../model/AssignmentSubmission');
const BookIssue = require('../model/BookIssue');
const Book = require('../model/Book');
const Leave = require('../model/Leave');
const Student = require('../model/Student');
const Admin = require('../model/Admin');

const STUDENT_ID = "69d9e65486af4df13dacc0c1";
const BRANCH_ID = "69d61d2fa9c89eaa23b68dec";
const CLIENT_ID = "69d600eab45ba5f7c0137cf6";

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ERP');
    console.log('Connected to DB');

    const admin = await Admin.findOne({ branch: BRANCH_ID });
    const student = await Student.findById(STUDENT_ID);

    if (!admin || !student) {
        console.error('Context missing');
        process.exit(1);
    }

    // 1. Seed Paid Fees
    console.log('Seeding Paid Fees...');
    await FeeCollection.deleteMany({ student: STUDENT_ID, status: 'paid' });
    const feeHistory = [
      {
        student: STUDENT_ID,
        branch: BRANCH_ID,
        client: CLIENT_ID,
        feeType: 'Tuition Fee (Q1)',
        amount: 15000,
        amountPaid: 15000,
        balance: 0,
        paymentMode: 'Online',
        transactionId: 'TXN_' + Math.random().toString(36).substr(2, 9),
        status: 'paid',
        paymentDate: new Date('2024-04-01'),
        collectedBy: admin._id
      },
      {
        student: STUDENT_ID,
        branch: BRANCH_ID,
        client: CLIENT_ID,
        feeType: 'Transportation Fee',
        amount: 2500,
        amountPaid: 2500,
        balance: 0,
        paymentMode: 'Cash',
        status: 'paid',
        paymentDate: new Date('2024-04-05'),
        collectedBy: admin._id
      }
    ];
    await FeeCollection.insertMany(feeHistory);

    // 2. Seed Assignment Submissions
    console.log('Seeding Assignment Submissions...');
    const assignments = await Assignment.find({ branch: BRANCH_ID }).limit(2);
    await AssignmentSubmission.deleteMany({ student: STUDENT_ID });
    
    if (assignments.length >= 1) {
        // Graded one
        await new AssignmentSubmission({
            assignment: assignments[0]._id,
            student: STUDENT_ID,
            submissionDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            content: "Solved all problems regarding projectile motion.",
            status: 'graded',
            marksReceived: 9,
            feedback: "Excellent work, very detailed steps.",
            branch: BRANCH_ID,
            client: CLIENT_ID
        }).save();

        if (assignments.length >= 2) {
            // Pending one
            await new AssignmentSubmission({
                assignment: assignments[1]._id,
                student: STUDENT_ID,
                submissionDate: new Date(),
                content: "Submitted draft for the literature review.",
                status: 'submitted',
                branch: BRANCH_ID,
                client: CLIENT_ID
            }).save();
        }
    }

    // 3. Seed Library Activity
    console.log('Seeding Library Loans...');
    await BookIssue.deleteMany({ member: STUDENT_ID });
    const book = await Book.findOne({ branch: BRANCH_ID });
    if (book) {
        await new BookIssue({
            book: book._id,
            member: STUDENT_ID,
            memberType: 'Student',
            issueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
            dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
            status: 'issued',
            branch: BRANCH_ID,
            client: CLIENT_ID,
            issuedBy: admin._id
        }).save();
    }

    // 4. Seed Leave History
    console.log('Seeding Leave History...');
    await Leave.deleteMany({ studentId: STUDENT_ID });
    await Leave.insertMany([
        {
            studentId: STUDENT_ID,
            branch: BRANCH_ID,
            client: CLIENT_ID,
            leaveType: 'Medical',
            startDate: new Date('2024-03-10'),
            endDate: new Date('2024-03-12'),
            days: 3,
            reason: 'High fever and viral infection.',
            status: 'approved',
            appliedBy: admin._id
        },
        {
            studentId: STUDENT_ID,
            branch: BRANCH_ID,
            client: CLIENT_ID,
            leaveType: 'Sick Leave',
            startDate: new Date('2024-04-15'),
            endDate: new Date('2024-04-15'),
            days: 1,
            reason: 'Routine checkup.',
            status: 'pending',
            appliedBy: admin._id
        }
    ]);

    console.log('Interactive Data Seeding Completed Successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding Error:', err);
    process.exit(1);
  }
}

seed();
