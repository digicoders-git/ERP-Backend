const Admin = require('../model/Admin');
const Student = require('../model/Student');
const Teacher = require('../model/Teacher');
const Staff = require('../model/Staff');
const FeeCollection = require('../model/FeeCollection');
const Attendance = require('../model/Attendance');
const Class = require('../model/Class');
const Section = require('../model/Section');
const mongoose = require('mongoose');

const getBranchAdmin = async (userId) => {
  const admin = await Admin.findById(userId).lean();
  if (!admin || admin.role !== 'branchAdmin') return null;
  return admin;
};

// Overview report — students + teachers + staff + fees + attendance summary
exports.getOverviewReport = async (req, res) => {
  try {
    const admin = await getBranchAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Only branch admin can access this' });

    const branchId = new mongoose.Types.ObjectId(admin.branch);
    const today = new Date();
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const thisMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

    const [
      totalStudents,
      activeStudents,
      totalTeachers,
      activeTeachers,
      totalStaff,
      activeStaff,
      totalClasses,
      totalSections,
      monthlyRevenue,
      pendingFees,
      avgAttendance
    ] = await Promise.all([
      Student.countDocuments({ branch: branchId }),
      Student.countDocuments({ branch: branchId, status: 'active' }),
      Teacher.countDocuments({ branch: branchId }),
      Teacher.countDocuments({ branch: branchId, status: true }),
      Staff.countDocuments({ branch: branchId }),
      Staff.countDocuments({ branch: branchId, status: true }),
      Class.countDocuments({ branch: branchId }),
      Section.countDocuments({ branch: branchId }),
      FeeCollection.aggregate([
        { $match: { branch: branchId, paymentDate: { $gte: thisMonthStart, $lte: thisMonthEnd } } },
        { $group: { _id: null, total: { $sum: '$amountPaid' } } }
      ]),
      FeeCollection.aggregate([
        { $match: { branch: branchId, status: 'pending' } },
        { $group: { _id: null, total: { $sum: '$balance' } } }
      ]),
      Attendance.aggregate([
        { $match: { branch: branchId, type: 'student', date: { $gte: thisMonthStart, $lte: thisMonthEnd } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);

    const presentCount = avgAttendance.find(a => a._id === 'present')?.count || 0;
    const totalAttendance = avgAttendance.reduce((s, a) => s + a.count, 0);
    const attendanceRate = totalAttendance > 0 ? parseFloat(((presentCount / totalAttendance) * 100).toFixed(1)) : 0;

    res.status(200).json({
      success: true,
      data: {
        students: { total: totalStudents, active: activeStudents, inactive: totalStudents - activeStudents },
        teachers: { total: totalTeachers, active: activeTeachers },
        staff: { total: totalStaff, active: activeStaff },
        classes: { total: totalClasses, sections: totalSections },
        fees: { monthlyRevenue: monthlyRevenue[0]?.total || 0, pendingAmount: pendingFees[0]?.total || 0 },
        attendance: { rate: attendanceRate, present: presentCount, total: totalAttendance }
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Student report — class-wise breakdown
exports.getStudentReport = async (req, res) => {
  try {
    const admin = await getBranchAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Only branch admin can access this' });

    const branchId = new mongoose.Types.ObjectId(admin.branch);

    const [classWise, genderWise, statusWise] = await Promise.all([
      Student.aggregate([
        { $match: { branch: branchId } },
        { $lookup: { from: 'classes', localField: 'class', foreignField: '_id', as: 'classInfo' } },
        { $unwind: { path: '$classInfo', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$classInfo.className',
            total: { $sum: 1 },
            boys: { $sum: { $cond: [{ $eq: ['$gender', 'male'] }, 1, 0] } },
            girls: { $sum: { $cond: [{ $eq: ['$gender', 'female'] }, 1, 0] } },
            active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Student.aggregate([
        { $match: { branch: branchId } },
        { $group: { _id: '$gender', count: { $sum: 1 } } }
      ]),
      Student.aggregate([
        { $match: { branch: branchId } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: { classWise, genderWise, statusWise }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Fee report — monthly collection breakdown
exports.getFeeReport = async (req, res) => {
  try {
    const admin = await getBranchAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Only branch admin can access this' });

    const branchId = new mongoose.Types.ObjectId(admin.branch);
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const [monthly, byStatus, byMode] = await Promise.all([
      FeeCollection.aggregate([
        { $match: { branch: branchId, paymentDate: { $gte: new Date(`${year}-01-01`), $lte: new Date(`${year}-12-31`) } } },
        {
          $group: {
            _id: { $month: '$paymentDate' },
            collected: { $sum: '$amountPaid' },
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      FeeCollection.aggregate([
        { $match: { branch: branchId } },
        { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$amountPaid' } } }
      ]),
      FeeCollection.aggregate([
        { $match: { branch: branchId, status: 'paid' } },
        { $group: { _id: '$paymentMode', count: { $sum: 1 }, amount: { $sum: '$amountPaid' } } }
      ])
    ]);

    // Map month numbers to names
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyFormatted = monthly.map(m => ({
      month: monthNames[m._id - 1],
      collected: m.collected,
      total: m.total,
      pending: m.total - m.collected,
      count: m.count,
      collectionRate: m.total > 0 ? parseFloat(((m.collected / m.total) * 100).toFixed(1)) : 0
    }));

    res.status(200).json({
      success: true,
      data: { monthly: monthlyFormatted, byStatus, byMode, year }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Attendance report — class-wise attendance
exports.getAttendanceReport = async (req, res) => {
  try {
    const admin = await getBranchAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Only branch admin can access this' });

    const branchId = new mongoose.Types.ObjectId(admin.branch);
    const today = new Date();
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [classWise, daily] = await Promise.all([
      Attendance.aggregate([
        { $match: { branch: branchId, type: 'student', date: { $gte: thisMonthStart } } },
        { $lookup: { from: 'students', localField: 'studentId', foreignField: '_id', as: 'student' } },
        { $unwind: { path: '$student', preserveNullAndEmptyArrays: true } },
        { $lookup: { from: 'classes', localField: 'student.class', foreignField: '_id', as: 'classInfo' } },
        { $unwind: { path: '$classInfo', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$classInfo.className',
            present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
            absent: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
            late: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
            total: { $sum: 1 }
          }
        },
        {
          $addFields: {
            percentage: {
              $cond: [
                { $gt: ['$total', 0] },
                { $round: [{ $multiply: [{ $divide: ['$present', '$total'] }, 100] }, 1] },
                0
              ]
            }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Attendance.aggregate([
        { $match: { branch: branchId, type: 'student', date: { $gte: thisMonthStart } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
            absent: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
            total: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } },
        { $limit: 30 }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: { classWise, daily }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
