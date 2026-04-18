const Admin = require('../model/Admin');
const Branch = require('../model/Branch');
const Staff = require('../model/Staff');
const Teacher = require('../model/Teacher');
const Student = require('../model/Student');
const FeeCollection = require('../model/FeeCollection');
const Vehicle = require('../model/Vehicle');
const Book = require('../model/Book');
const HostelAllocation = require('../model/HostelAllocation');
const Approval = require('../model/Approval');
const mongoose = require('mongoose');

const getClientAdmin = async (userId) => {
  return await Admin.findById(userId).lean();
};

exports.getMe = async (req, res) => {
  try {
    const admin = await getClientAdmin(req.userId);
    if (!admin) return res.status(403).json({ success: false, message: 'Admin not found' });
    res.status(200).json({ success: true, admin });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getDashboard = async (req, res) => {
  try {
    const admin = await getClientAdmin(req.userId);
    if (!admin) return res.status(403).json({ success: false, message: 'Only school admin can access this' });

    const clientId = admin.client;
    if (!clientId) return res.status(400).json({ success: false, message: 'Admin has no client assigned' });

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      branchStats,
      staffStats,
      teacherStats,
      studentStats,
      feeStats,
      vehicleStats,
      bookStats,
      hostelStats,
      pendingApprovals,
      recentBranches
    ] = await Promise.all([
      Branch.aggregate([
        { $match: { client: new mongoose.Types.ObjectId(clientId) } },
        { $group: { _id: null, total: { $sum: 1 }, active: { $sum: { $cond: ['$status', 1, 0] } } } }
      ]),
      Staff.aggregate([
        { $match: { client: new mongoose.Types.ObjectId(clientId) } },
        { $group: { _id: null, total: { $sum: 1 }, active: { $sum: { $cond: ['$status', 1, 0] } } } }
      ]),
      Teacher.aggregate([
        { $match: { client: new mongoose.Types.ObjectId(clientId) } },
        { $group: { _id: null, total: { $sum: 1 }, active: { $sum: { $cond: ['$status', 1, 0] } } } }
      ]),
      Student.aggregate([
        { $match: { client: new mongoose.Types.ObjectId(clientId) } },
        { $group: { _id: null, total: { $sum: 1 }, active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } } } }
      ]),
      FeeCollection.aggregate([
        { $match: { client: new mongoose.Types.ObjectId(clientId), paymentDate: { $gte: thisMonthStart } } },
        { $group: { _id: null, collected: { $sum: '$amountPaid' }, pending: { $sum: '$balance' } } }
      ]),
      Vehicle.aggregate([
        { $match: { client: new mongoose.Types.ObjectId(clientId) } },
        { $group: { _id: null, total: { $sum: 1 }, active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } } } }
      ]),
      Book.aggregate([
        { $match: { client: new mongoose.Types.ObjectId(clientId) } },
        { $group: { _id: null, total: { $sum: 1 }, issued: { $sum: '$issuedCopies' }, available: { $sum: '$availableCopies' } } }
      ]),
      HostelAllocation.aggregate([
        { $match: { client: new mongoose.Types.ObjectId(clientId), allocationStatus: 'allocated' } },
        { $count: 'occupied' }
      ]),
      Approval.countDocuments({ status: 'Pending' }),
      Branch.find({ client: clientId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('_id branchName branchCode location status')
        .lean()
    ]);

    const branchesWithCounts = await Promise.all(
      recentBranches.map(async (branch) => {
        const [studentCount, teacherCount] = await Promise.all([
          Student.countDocuments({ branch: branch._id, client: clientId }),
          Teacher.countDocuments({ branch: branch._id, client: clientId })
        ]);
        return {
          ...branch,
          students: studentCount,
          teachers: teacherCount
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        branches: {
          total: branchStats[0]?.total || 0,
          active: branchStats[0]?.active || 0,
          inactive: (branchStats[0]?.total || 0) - (branchStats[0]?.active || 0)
        },
        staff: {
          total: staffStats[0]?.total || 0,
          active: staffStats[0]?.active || 0,
          onLeave: (staffStats[0]?.total || 0) - (staffStats[0]?.active || 0)
        },
        teachers: {
          total: teacherStats[0]?.total || 0,
          active: teacherStats[0]?.active || 0,
          onLeave: (teacherStats[0]?.total || 0) - (teacherStats[0]?.active || 0)
        },
        students: {
          total: studentStats[0]?.total || 0,
          active: studentStats[0]?.active || 0
        },
        fees: {
          monthlyCollected: feeStats[0]?.collected || 0,
          monthlyPending: feeStats[0]?.pending || 0
        },
        transport: {
          totalVehicles: vehicleStats[0]?.total || 0,
          active: vehicleStats[0]?.active || 0
        },
        library: {
          totalBooks: bookStats[0]?.total || 0,
          issued: bookStats[0]?.issued || 0,
          available: bookStats[0]?.available || 0
        },
        hostel: {
          occupied: hostelStats[0]?.occupied || 0
        },
        pendingApprovals,
        recentBranches: branchesWithCounts
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getBranchDetail = async (req, res) => {
  try {
    const { branchId } = req.params;
    const admin = await getClientAdmin(req.userId);
    if (!admin) return res.status(403).json({ success: false, message: 'Unauthorized' });

    const branch = await Branch.findById(branchId).lean();
    if (!branch) return res.status(404).json({ success: false, message: 'Branch not found' });

    const [studentList, teacherList, fees] = await Promise.all([
      Student.find({ branch: branchId }).select('_id name email mobile status class rollNo').lean().limit(100),
      Teacher.find({ branch: branchId }).select('_id name email mobile status subject').lean().limit(100),
      FeeCollection.aggregate([
        { $match: { branch: new mongoose.Types.ObjectId(branchId) } },
        { $group: { _id: null, collected: { $sum: '$amountPaid' }, pending: { $sum: '$balance' } } }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: {
        branch,
        students: studentList,
        teachers: teacherList,
        fees: fees[0] || { collected: 0, pending: 0 }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getStaffData = async (req, res) => {
  try {
    const admin = await getClientAdmin(req.userId);
    if (!admin) return res.status(403).json({ success: false, message: 'Unauthorized' });

    const { search = '' } = req.query;
    let query = { client: admin.client };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } }
      ];
    }

    const [staffList, total, active] = await Promise.all([
      Staff.find(query)
        .populate('branch', 'branchName')
        .select('_id name email mobile status branch qualification experience salary profileImage')
        .lean()
        .limit(100),
      Staff.countDocuments(query),
      Staff.countDocuments({ ...query, status: true })
    ]);

    res.status(200).json({
      success: true,
      data: staffList,
      stats: {
        total,
        active,
        onLeave: total - active,
        departments: 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getStaffById = async (req, res) => {
  try {
    const { id } = req.params;
    const staff = await Staff.findById(id).lean();
    if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });
    res.status(200).json({ success: true, data: staff });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getTeacherData = async (req, res) => {
  try {
    const admin = await getClientAdmin(req.userId);
    if (!admin) return res.status(403).json({ success: false, message: 'Unauthorized' });

    const { search = '' } = req.query;
    let query = { client: admin.client };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } }
      ];
    }

    const [teacherList, total, active] = await Promise.all([
      Teacher.find(query)
        .populate('branch', 'branchName')
        .select('_id name email mobile status branch subject qualification experience salary profileImage')
        .lean()
        .limit(100),
      Teacher.countDocuments(query),
      Teacher.countDocuments({ ...query, status: true })
    ]);

    res.status(200).json({
      success: true,
      data: teacherList,
      stats: {
        total,
        active,
        onLeave: total - active
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getFeeData = async (req, res) => {
  try {
    const admin = await getClientAdmin(req.userId);
    if (!admin) return res.status(403).json({ success: false, message: 'Unauthorized' });

    const { search = '' } = req.query;
    let query = { client: admin.client };

    if (search) {
      query.$or = [
        { 'student.name': { $regex: search, $options: 'i' } },
        { 'student.email': { $regex: search, $options: 'i' } }
      ];
    }

    const [feeList, total, collected, pending] = await Promise.all([
      FeeCollection.find(query)
        .populate('student', 'name email class')
        .populate('branch', 'branchName')
        .select('_id student amountPaid balance paymentDate status')
        .lean()
        .limit(100),
      FeeCollection.countDocuments(query),
      FeeCollection.aggregate([
        { $match: query },
        { $group: { _id: null, total: { $sum: '$amountPaid' } } }
      ]),
      FeeCollection.aggregate([
        { $match: query },
        { $group: { _id: null, total: { $sum: '$balance' } } }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: feeList,
      stats: {
        total,
        collected: collected[0]?.total || 0,
        pending: pending[0]?.total || 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getTransportData = async (req, res) => {
  try {
    const admin = await getClientAdmin(req.userId);
    if (!admin) return res.status(403).json({ success: false, message: 'Unauthorized' });

    const { search = '' } = req.query;
    let query = { client: admin.client };

    if (search) {
      query.$or = [
        { vehicleNumber: { $regex: search, $options: 'i' } },
        { registrationNumber: { $regex: search, $options: 'i' } },
        { driverName: { $regex: search, $options: 'i' } }
      ];
    }

    const [vehicleList, total, active] = await Promise.all([
      Vehicle.find(query)
        .select('_id vehicleNumber registrationNumber status driverName driverPhone capacity')
        .lean()
        .limit(100),
      Vehicle.countDocuments(query),
      Vehicle.countDocuments({ ...query, status: 'active' })
    ]);

    res.status(200).json({
      success: true,
      data: vehicleList,
      stats: {
        total,
        active,
        inactive: total - active
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getLibraryData = async (req, res) => {
  try {
    const admin = await getClientAdmin(req.userId);
    if (!admin) return res.status(403).json({ success: false, message: 'Unauthorized' });

    const { search = '' } = req.query;
    let query = { client: admin.client };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } },
        { isbn: { $regex: search, $options: 'i' } }
      ];
    }

    const [bookList, total, issued, available] = await Promise.all([
      Book.find(query)
        .select('_id title author isbn totalCopies availableCopies issuedCopies category')
        .lean()
        .limit(100),
      Book.countDocuments(query),
      Book.aggregate([
        { $match: query },
        { $group: { _id: null, total: { $sum: '$issuedCopies' } } }
      ]),
      Book.aggregate([
        { $match: query },
        { $group: { _id: null, total: { $sum: '$availableCopies' } } }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: bookList,
      stats: {
        total,
        issued: issued[0]?.total || 0,
        available: available[0]?.total || 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getLibrarianData = async (req, res) => {
  try {
    const admin = await getClientAdmin(req.userId);
    if (!admin) return res.status(403).json({ success: false, message: 'Unauthorized' });

    const librarians = await Admin.find({ client: admin.client, role: 'libraryAdmin' })
      .select('_id name email mobile status')
      .lean()
      .limit(100);

    res.status(200).json({ success: true, data: librarians });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getHostelData = async (req, res) => {
  try {
    const admin = await getClientAdmin(req.userId);
    if (!admin) return res.status(403).json({ success: false, message: 'Unauthorized' });

    const { search = '' } = req.query;
    let query = { client: admin.client };

    if (search) {
      query.$or = [
        { 'student.name': { $regex: search, $options: 'i' } },
        { 'room.roomNumber': { $regex: search, $options: 'i' } }
      ];
    }

    const [allocationList, total, allocated] = await Promise.all([
      HostelAllocation.find(query)
        .populate('student', 'name email class')
        .populate('room', 'roomNumber roomType')
        .select('_id student room allocationStatus allocationDate')
        .lean()
        .limit(100),
      HostelAllocation.countDocuments(query),
      HostelAllocation.countDocuments({ ...query, allocationStatus: 'allocated' })
    ]);

    res.status(200).json({
      success: true,
      data: allocationList,
      stats: {
        total,
        allocated,
        vacant: total - allocated
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getParentData = async (req, res) => {
  try {
    const admin = await getClientAdmin(req.userId);
    if (!admin) return res.status(403).json({ success: false, message: 'Unauthorized' });

    const { search = '' } = req.query;
    let query = { client: admin.client };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } }
      ];
    }

    const [studentList, total, active] = await Promise.all([
      Student.find(query)
        .populate('branch', 'branchName')
        .select('_id name email mobile status branch class rollNo fatherName motherName')
        .lean()
        .limit(100),
      Student.countDocuments(query),
      Student.countDocuments({ ...query, status: 'active' })
    ]);

    res.status(200).json({
      success: true,
      data: studentList,
      stats: {
        total,
        active,
        inactive: total - active
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getReports = async (req, res) => {
  try {
    const admin = await getClientAdmin(req.userId);
    if (!admin) return res.status(403).json({ success: false, message: 'Unauthorized' });

    const clientId = admin.client;
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalStudents,
      totalStaff,
      totalTeachers,
      totalBranches,
      activeBranches,
      feeStats,
      branchList,
      branchRevenueStats
    ] = await Promise.all([
      Student.countDocuments({ client: clientId }),
      Staff.countDocuments({ client: clientId }),
      Teacher.countDocuments({ client: clientId }),
      Branch.countDocuments({ client: clientId }),
      Branch.countDocuments({ client: clientId, status: true }),
      FeeCollection.aggregate([
        { $match: { client: new mongoose.Types.ObjectId(clientId) } },
        { $group: { _id: null, collected: { $sum: '$amountPaid' }, pending: { $sum: '$balance' } } }
      ]),
      Branch.find({ client: clientId })
        .select('_id branchName location status')
        .lean()
        .limit(100),
      FeeCollection.aggregate([
        { $match: { client: new mongoose.Types.ObjectId(clientId) } },
        { $group: { _id: '$branch', collected: { $sum: '$amountPaid' } } }
      ])
    ]);

    // Create a map for branch revenue for quick lookup
    const revenueMap = {};
    branchRevenueStats.forEach(stat => {
      if (stat._id) {
        revenueMap[stat._id.toString()] = stat.collected;
      }
    });

    // Get student and teacher counts for each branch
    const branchesWithCounts = await Promise.all(
      branchList.map(async (branch) => {
        const [studentCount, teacherCount] = await Promise.all([
          Student.countDocuments({ branch: branch._id }),
          Teacher.countDocuments({ branch: branch._id })
        ]);
        return {
          _id: branch._id,
          name: branch.branchName,
          location: branch.location,
          status: branch.status ? 'Active' : 'Inactive',
          students: studentCount,
          teachers: teacherCount,
          fees: revenueMap[branch._id.toString()] || 0
        };
      })
    );

    const totalRevenue = feeStats[0]?.collected || 0;
    const totalPending = feeStats[0]?.pending || 0;

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalBranches,
          activeBranches,
          totalStudents,
          totalTeachers,
          totalStaff,
          totalRevenue,
          feePaid: totalRevenue,
          feePending: totalPending,
          feePartial: 0
        },
        branches: branchesWithCounts,
        generatedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Reports error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const admin = await getClientAdmin(req.userId);
    if (!admin) return res.status(403).json({ success: false, message: 'Admin not found' });
    res.status(200).json({ success: true, data: admin });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, mobile, address } = req.body;
    const admin = await Admin.findByIdAndUpdate(
      req.userId,
      { name, mobile, address },
      { new: true }
    ).lean();

    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });
    res.status(200).json({ success: true, message: 'Profile updated', data: admin });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
