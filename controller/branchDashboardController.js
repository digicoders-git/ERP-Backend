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
    console.log('Dashboard request from userId:', req.userId);
    
    const admin = await getBranchAdmin(req.userId);
    console.log('Admin found:', admin);
    
    if (!admin) {
      console.log('Admin not found or not branch admin');
      return res.status(403).json({ message: 'Only branch admin can access this' });
    }

    const branchId = admin.branch;
    console.log('Branch ID:', branchId);
    
    if (!branchId) {
      console.log('Branch ID not found for admin');
      return res.status(400).json({ message: 'Branch not assigned to admin' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const thisMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

    console.log('Fetching stats for branch:', branchId);

    const [
      totalStudents,
      totalTeachers,
      totalStaff,
      totalClasses,
      totalSections,
      pendingApprovals,
      approvedApprovals,
      rejectedApprovals,
      recentApprovals
    ] = await Promise.all([
      Student.countDocuments({ branch: branchId, status: 'active' }).catch(err => { console.error('Student count error:', err); return 0; }),
      Teacher.countDocuments({ branch: branchId, status: true }).catch(err => { console.error('Teacher count error:', err); return 0; }),
      Staff.countDocuments({ branch: branchId, status: true }).catch(err => { console.error('Staff count error:', err); return 0; }),
      Class.countDocuments({ branch: branchId }).catch(err => { console.error('Class count error:', err); return 0; }),
      mongoose.connection.collection('sections').countDocuments({ branch: new mongoose.Types.ObjectId(branchId) }).catch(err => { console.error('Section count error:', err); return 0; }),
      Approval.countDocuments({ branch: branchId, status: 'Pending' }).catch(err => { console.error('Pending approval count error:', err); return 0; }),
      Approval.countDocuments({ branch: branchId, status: 'Approved' }).catch(err => { console.error('Approved count error:', err); return 0; }),
      Approval.countDocuments({ branch: branchId, status: 'Rejected' }).catch(err => { console.error('Rejected count error:', err); return 0; }),
      Approval.find({ branch: branchId }).sort({ createdAt: -1 }).limit(5).populate('requestedBy', 'name email').populate('createdBy', 'name email').select('type title name status createdAt requestedBy createdBy').lean().catch(err => { console.error('Recent approvals error:', err); return []; })
    ]);

    console.log('Stats fetched successfully:', {
      totalStudents,
      totalTeachers,
      totalStaff,
      totalClasses,
      totalSections,
      pendingApprovals,
      approvedApprovals,
      rejectedApprovals
    });

    res.status(200).json({
      success: true,
      stats: {
        totalStudents,
        totalTeachers,
        totalStaff,
        totalClasses,
        totalSections,
        pendingApprovals,
        approvedApprovals,
        rejectedApprovals
      },
      recentApprovals
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Server error', error: error.message, stack: error.stack });
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
