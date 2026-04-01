const Admin = require('../model/Admin');
const Branch = require('../model/Branch');
const Staff = require('../model/Staff');
const Teacher = require('../model/Teacher');
const Student = require('../model/Student');
const FeeCollection = require('../model/FeeCollection');
const Vehicle = require('../model/Vehicle');
const Route = require('../model/Route');
const Book = require('../model/Book');
const BookIssue = require('../model/BookIssue');
const HostelAllocation = require('../model/HostelAllocation');
const Room = require('../model/Room');
const TransportAllocation = require('../model/TransportAllocation');
const Approval = require('../model/Approval');
const mongoose = require('mongoose');

const getClientAdmin = async (userId) => {
  const admin = await Admin.findById(userId).lean();
  if (!admin || admin.role !== 'clientAdmin') return null;
  return admin;
};

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
// Single call — all 8 panels summary

exports.getDashboard = async (req, res) => {
  try {
    const admin = await getClientAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Only school admin can access this' });

    const clientId = admin.client;
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
      // Branches
      Branch.aggregate([
        { $match: { client: new mongoose.Types.ObjectId(clientId) } },
        { $group: { _id: null, total: { $sum: 1 }, active: { $sum: { $cond: ['$status', 1, 0] } } } }
      ]),
      // Staff
      Staff.aggregate([
        { $match: { client: new mongoose.Types.ObjectId(clientId) } },
        { $group: { _id: null, total: { $sum: 1 }, active: { $sum: { $cond: ['$status', 1, 0] } } } }
      ]),
      // Teachers
      Teacher.aggregate([
        { $match: { client: new mongoose.Types.ObjectId(clientId) } },
        { $group: { _id: null, total: { $sum: 1 }, active: { $sum: { $cond: ['$status', 1, 0] } } } }
      ]),
      // Students
      Student.aggregate([
        { $match: { client: new mongoose.Types.ObjectId(clientId) } },
        { $group: { _id: null, total: { $sum: 1 }, active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } } } }
      ]),
      // Fee this month
      FeeCollection.aggregate([
        { $match: { client: new mongoose.Types.ObjectId(clientId), paymentDate: { $gte: thisMonthStart } } },
        { $group: { _id: null, collected: { $sum: '$amountPaid' }, pending: { $sum: '$balance' } } }
      ]),
      // Vehicles
      Vehicle.aggregate([
        { $match: { client: new mongoose.Types.ObjectId(clientId) } },
        { $group: { _id: null, total: { $sum: 1 }, active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } } } }
      ]),
      // Books
      Book.aggregate([
        { $match: { client: new mongoose.Types.ObjectId(clientId) } },
        { $group: { _id: null, total: { $sum: 1 }, issued: { $sum: '$issuedCopies' }, available: { $sum: '$availableCopies' } } }
      ]),
      // Hostel
      HostelAllocation.aggregate([
        { $match: { client: new mongoose.Types.ObjectId(clientId), allocationStatus: 'allocated' } },
        { $count: 'occupied' }
      ]),
      // Pending approvals
      Approval.countDocuments({ status: 'Pending' }),
      // Recent branches
      Branch.find({ client: clientId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('branchName branchCode location students teachers status')
        .lean()
    ]);

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
        recentBranches
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── BRANCH DETAIL ────────────────────────────────────────────────────────────

exports.getBranchDetail = async (req, res) => {
  try {
    const admin = await getClientAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Only school admin can access this' });

    const { branchId } = req.params;
    const bid = new mongoose.Types.ObjectId(branchId);

    const [branch, students, teachers, feeStats, recentFees] = await Promise.all([
      Branch.findOne({ _id: branchId, client: admin.client }).lean(),
      Student.find({ branch: bid, status: 'active' })
        .populate('class', 'className')
        .select('firstName lastName rollNumber class status')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      Teacher.find({ branch: bid, status: true })
        .select('name email mobile subjects qualification status')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      FeeCollection.aggregate([
        { $match: { branch: bid } },
        { $group: { _id: '$status', total: { $sum: '$amountPaid' }, count: { $sum: 1 } } }
      ]),
      FeeCollection.find({ branch: bid })
        .populate('student', 'firstName lastName rollNumber')
        .sort({ paymentDate: -1 })
        .limit(10)
        .lean()
    ]);

    if (!branch) return res.status(404).json({ message: 'Branch not found' });

    const feeMap = {};
    feeStats.forEach(f => { feeMap[f._id] = { total: f.total, count: f.count }; });

    res.status(200).json({
      success: true,
      data: {
        branch,
        students: students.map(s => ({
          id: s._id,
          name: `${s.firstName} ${s.lastName}`,
          rollNo: s.rollNumber,
          class: s.class?.className || '',
          status: s.status
        })),
        teachers: teachers.map(t => ({
          id: t._id,
          name: t.name,
          email: t.email,
          phone: t.mobile,
          subjects: t.subjects,
          experience: t.qualification,
          status: t.status ? 'Active' : 'Inactive'
        })),
        fees: {
          paid: { amount: feeMap['paid']?.total || 0, count: feeMap['paid']?.count || 0 },
          pending: { amount: feeMap['pending']?.total || 0, count: feeMap['pending']?.count || 0 },
          partial: { amount: feeMap['partial']?.total || 0, count: feeMap['partial']?.count || 0 },
          recentPayments: recentFees.map(f => ({
            id: f._id,
            student: f.student ? `${f.student.firstName} ${f.student.lastName}` : 'Unknown',
            rollNo: f.student?.rollNumber || '',
            amount: f.amountPaid,
            due: f.balance,
            total: f.amount,
            status: f.status,
            date: f.paymentDate
          }))
        }
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── ALL PANELS SUMMARY ───────────────────────────────────────────────────────

exports.getStaffData = async (req, res) => {
  try {
    const admin = await getClientAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Access denied' });

    const { search, department } = req.query;
    const query = { client: admin.client };
    if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];

    const [staff, total, active, onLeave] = await Promise.all([
      Staff.find(query).populate('branch', 'branchName').select('-createdBy').sort({ createdAt: -1 }).limit(50).lean(),
      Staff.countDocuments({ client: admin.client }),
      Staff.countDocuments({ client: admin.client, status: true }),
      Staff.countDocuments({ client: admin.client, status: false })
    ]);

    res.status(200).json({ success: true, data: staff, stats: { total, active, onLeave, departments: 0 } });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getTeacherData = async (req, res) => {
  try {
    const admin = await getClientAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Access denied' });

    const { search } = req.query;
    const query = { client: admin.client };
    if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { subjects: { $regex: search, $options: 'i' } }];

    const [teachers, total, active] = await Promise.all([
      Teacher.find(query).populate('branch', 'branchName').select('-createdBy').sort({ createdAt: -1 }).limit(50).lean(),
      Teacher.countDocuments({ client: admin.client }),
      Teacher.countDocuments({ client: admin.client, status: true })
    ]);

    res.status(200).json({ success: true, data: teachers, stats: { total, active, onLeave: total - active } });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getFeeData = async (req, res) => {
  try {
    const admin = await getClientAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Access denied' });

    const { search, status } = req.query;
    const query = { client: admin.client };
    if (status) query.status = status;

    const [fees, stats] = await Promise.all([
      FeeCollection.find(query)
        .populate('student', 'firstName lastName rollNumber class')
        .sort({ paymentDate: -1 })
        .limit(50)
        .lean(),
      FeeCollection.aggregate([
        { $match: { client: new mongoose.Types.ObjectId(admin.client) } },
        { $group: { _id: '$status', total: { $sum: '$amountPaid' }, count: { $sum: 1 } } }
      ])
    ]);

    const statsMap = {};
    stats.forEach(s => { statsMap[s._id] = { total: s.total, count: s.count }; });

    const feeList = fees.map(f => ({
      id: f._id,
      studentId: f.student?.rollNumber || '',
      name: f.student ? `${f.student.firstName} ${f.student.lastName}` : 'Unknown',
      class: f.student?.class || '',
      feeAmount: f.amount,
      paid: f.amountPaid,
      pending: f.balance,
      status: f.status === 'paid' ? 'Paid' : f.status === 'partial' ? 'Pending' : 'Overdue',
      lastPayment: f.paymentDate
    }));

    res.status(200).json({
      success: true,
      data: feeList,
      stats: {
        totalStudents: feeList.length,
        feePaid: statsMap['paid']?.count || 0,
        pending: statsMap['pending']?.count || 0,
        overdue: 0,
        totalCollection: statsMap['paid']?.total || 0
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getTransportData = async (req, res) => {
  try {
    const admin = await getClientAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Access denied' });

    const [vehicles, routes, allocations] = await Promise.all([
      Vehicle.find({ client: admin.client }).populate('branch', 'branchName').lean(),
      Route.find({ client: admin.client }).lean(),
      TransportAllocation.countDocuments({ client: admin.client, status: true })
    ]);

    const vehicleList = vehicles.map(v => ({
      id: v._id,
      vehicleNo: v.vehicleNo,
      route: routes.find(r => r._id.toString() === v.route?.toString())?.routeName || 'Unassigned',
      capacity: v.vehicleCapacity,
      students: 0,
      driver: '',
      status: v.status === 'active' ? 'Active' : 'Maintenance'
    }));

    res.status(200).json({
      success: true,
      data: vehicleList,
      stats: {
        totalVehicles: vehicles.length,
        active: vehicles.filter(v => v.status === 'active').length,
        students: allocations,
        routes: routes.length
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getLibraryData = async (req, res) => {
  try {
    const admin = await getClientAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Access denied' });

    const { search } = req.query;
    const query = { client: admin.client };
    if (search) query.$or = [{ title: { $regex: search, $options: 'i' } }, { author: { $regex: search, $options: 'i' } }];

    const [books, totalBooks, issuedCount] = await Promise.all([
      Book.find(query).select('title author ISBN category totalCopies availableCopies issuedCopies').sort({ createdAt: -1 }).limit(50).lean(),
      Book.countDocuments({ client: admin.client }),
      BookIssue.countDocuments({ client: admin.client, status: { $in: ['issued', 'overdue'] } })
    ]);

    const bookList = books.map(b => ({
      id: b._id,
      bookId: b.ISBN || b._id.toString().slice(-6).toUpperCase(),
      title: b.title,
      author: b.author,
      issued: b.issuedCopies || 0,
      available: b.availableCopies || 0,
      category: b.category
    }));

    res.status(200).json({
      success: true,
      data: bookList,
      stats: { totalBooks, issued: issuedCount, available: totalBooks - issuedCount, members: 0 }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getHostelData = async (req, res) => {
  try {
    const admin = await getClientAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Access denied' });

    const [rooms, allocations] = await Promise.all([
      Room.find({ client: admin.client }).populate('hostel', 'hostelName').lean(),
      HostelAllocation.find({ client: admin.client, allocationStatus: 'allocated' })
        .select('studentId studentName roomNo hostel')
        .lean()
    ]);

    const roomList = rooms.map(r => {
      const roomAllocations = allocations.filter(a => a.roomNo === r.roomNo);
      return {
        id: r._id,
        roomNo: r.roomNo,
        type: r.roomType?.toString() || 'Standard',
        occupancy: `${roomAllocations.length}/${r.capacity}`,
        student: roomAllocations.map(a => a.studentName).join(', ') || 'Vacant',
        status: roomAllocations.length > 0 ? 'Occupied' : 'Vacant'
      };
    });

    res.status(200).json({
      success: true,
      data: roomList,
      stats: {
        totalRooms: rooms.length,
        occupied: allocations.length,
        vacant: rooms.length - allocations.length,
        students: allocations.length
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getParentData = async (req, res) => {
  try {
    const admin = await getClientAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Access denied' });

    const { search } = req.query;
    const query = { client: admin.client, status: 'active' };
    if (search) query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { rollNumber: { $regex: search, $options: 'i' } }
    ];

    const [students, total, active] = await Promise.all([
      Student.find(query)
        .populate('class', 'className')
        .select('firstName lastName rollNumber class guardianInfo status')
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      Student.countDocuments({ client: admin.client }),
      Student.countDocuments({ client: admin.client, status: 'active' })
    ]);

    const parentList = students.map(s => ({
      id: s._id,
      studentId: s.rollNumber || '',
      name: `${s.firstName} ${s.lastName}`,
      class: s.class?.className || '',
      parentName: s.guardianInfo?.fatherName || '',
      phone: s.guardianInfo?.guardianPhone || '',
      status: s.status === 'active' ? 'Active' : 'Inactive'
    }));

    res.status(200).json({
      success: true,
      data: parentList,
      stats: { totalStudents: total, activeParents: active, complaints: 0, resolved: 0 }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── REPORTS ──────────────────────────────────────────────────────────────────

exports.getReports = async (req, res) => {
  try {
    const admin = await getClientAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Access denied' });

    const clientId = new mongoose.Types.ObjectId(admin.client);

    const [branches, studentStats, teacherCount, staffCount, feeStats] = await Promise.all([
      Branch.find({ client: admin.client }).select('branchName location students teachers status rating fees').lean(),
      Student.aggregate([
        { $match: { client: clientId } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Teacher.countDocuments({ client: admin.client }),
      Staff.countDocuments({ client: admin.client }),
      FeeCollection.aggregate([
        { $match: { client: clientId } },
        { $group: { _id: null, totalRevenue: { $sum: '$amountPaid' } } }
      ])
    ]);

    const totalStudents = studentStats.reduce((s, i) => s + i.count, 0);
    const totalRevenue = feeStats[0]?.totalRevenue || 0;

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalBranches: branches.length,
          activeBranches: branches.filter(b => b.status).length,
          totalStudents,
          totalTeachers: teacherCount,
          totalStaff: staffCount,
          totalRevenue
        },
        branches: branches.map(b => ({
          name: b.branchName,
          location: b.location,
          students: b.students || 0,
          teachers: b.teachers || 0,
          status: b.status ? 'Active' : 'Inactive',
          rating: b.rating || 0,
          fees: b.fees || 0
        }))
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
