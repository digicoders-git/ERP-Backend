const Admin = require('../model/Admin');
const Branch = require('../model/Branch');
const Staff = require('../model/Staff');
const Teacher = require('../model/Teacher');
const Student = require('../model/Student');
const FeeCollection = require('../model/FeeCollection');
const Attendance = require('../model/Attendance');
const Approval = require('../model/Approval');
const Class = require('../model/Class');
const mongoose = require('mongoose');

const getBranchAdmin = async (userId) => {
  const admin = await Admin.findById(userId).lean();
  if (!admin || admin.role !== 'branchAdmin') return null;
  return admin;
};

// Full dashboard — all stats in one call using Promise.all
exports.getBranchDashboard = async (req, res) => {
  try {
    const admin = await getBranchAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Only branch admin can access this' });

    const branchId = admin.branch;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const thisMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

    const [
      totalStudents,
      totalTeachers,
      totalStaff,
      activeClasses,
      pendingApprovals,
      monthlyRevenue,
      todayStudentAttendance,
      totalStudentsForAttendance,
      recentActivities
    ] = await Promise.all([
      Student.countDocuments({ branch: branchId, status: 'active' }),
      Teacher.countDocuments({ branch: branchId, status: true }),
      Staff.countDocuments({ branch: branchId, status: true }),
      Class.countDocuments({ branch: branchId }),
      Approval.countDocuments({ branch: branchId, status: 'Pending' }),
      FeeCollection.aggregate([
        { $match: { branch: new mongoose.Types.ObjectId(branchId), paymentDate: { $gte: thisMonthStart, $lte: thisMonthEnd } } },
        { $group: { _id: null, total: { $sum: '$amountPaid' } } }
      ]),
      Attendance.countDocuments({ branch: branchId, date: { $gte: today, $lte: todayEnd }, type: 'student', status: 'present' }),
      Attendance.countDocuments({ branch: branchId, date: { $gte: today, $lte: todayEnd }, type: 'student' }),
      Approval.find({ branch: branchId }).sort({ createdAt: -1 }).limit(5).select('type name status priority createdAt').lean()
    ]);

    const todayAttendance = totalStudentsForAttendance > 0
      ? parseFloat(((todayStudentAttendance / totalStudentsForAttendance) * 100).toFixed(1))
      : 0;

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalStudents,
          totalTeachers,
          totalStaff,
          activeClasses,
          pendingApprovals,
          monthlyRevenue: monthlyRevenue[0]?.total || 0,
          todayAttendance
        },
        recentActivities
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Branch profile — own branch info
exports.getBranchProfile = async (req, res) => {
  try {
    const admin = await getBranchAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Only branch admin can access this' });

    const branch = await Branch.findById(admin.branch)
      .populate('client', 'name phone')
      .lean();

    if (!branch) return res.status(404).json({ message: 'Branch not found' });

    res.status(200).json({ success: true, data: branch });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
