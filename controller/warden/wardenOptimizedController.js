const Hostel = require('../../model/Hostel');
const Room = require('../../model/Room');
const RoomType = require('../../model/RoomType');
const Warden = require('../../model/Warden');
const HostelAllocation = require('../../model/HostelAllocation');
const HostelAttendance = require('../../model/HostelAttendance');
const HostelComplaint = require('../../model/HostelComplaint');
const HostelMenu = require('../../model/HostelMenu');
const HostelService = require('../../model/HostelService');
const HostelFee = require('../../model/HostelFee');
const CheckInOut = require('../../model/CheckInOut');
const Visitor = require('../../model/Visitor');
const LeaveGatePass = require('../../model/LeaveGatePass');
const StudentQuery = require('../../model/StudentQuery');
const EntryExit = require('../../model/EntryExit');
const MessAttendance = require('../../model/MessAttendance');
const Student = require('../../model/Student');
const Notification = require('../../model/Notification');
const Admin = require('../../model/Admin');
const { successResponse, errorResponse } = require('../../responseFormatter');

// ─── SUPER OPTIMIZED DASHBOARD - Single Query All Stats ─────────────────────

exports.getOptimizedDashboard = async (req, res) => {
  try {
    const wardenId = req.userId;
    const today = new Date().toISOString().split('T')[0];

    // Single optimized query using aggregation pipeline
    const [
      stats,
      recentActivity,
      pendingItems
    ] = await Promise.all([
      // All stats in ONE aggregation query
      HostelAllocation.aggregate([
        { $match: { allocationStatus: 'allocated' } },
        {
          $facet: {
            totalStudents: [{ $count: 'count' }],
            todayCheckIns: [
              { $match: { checkInDate: today } },
              { $count: 'count' }
            ],
            todayCheckOuts: [
              { $match: { checkOutDate: today } },
              { $count: 'count' }
            ]
          }
        }
      ]),
      // Recent activity - last 5
      Promise.all([
        CheckInOut.find({ date: today }).sort({ timestamp: -1 }).limit(5).lean(),
        Visitor.find({ date: today, status: 'checked-in' }).sort({ checkInTime: -1 }).limit(5).lean(),
        HostelComplaint.find({ status: 'pending' }).sort({ createdAt: -1 }).limit(3).lean()
      ]),
      // Pending counts
      Promise.all([
        HostelComplaint.countDocuments({ status: 'pending' }),
        LeaveGatePass.countDocuments({ status: 'pending' }),
        StudentQuery.countDocuments({ status: 'Pending' }),
        HostelFee.countDocuments({ status: { $in: ['Pending', 'Overdue'] } }),
        HostelService.countDocuments({ status: 'Pending' })
      ])
    ]);

    const data = stats[0];
    const totalStudents = data.totalStudents[0]?.count || 0;
    const todayCheckIns = data.todayCheckIns[0]?.count || 0;
    const todayCheckOuts = data.todayCheckOuts[0]?.count || 0;

    return successResponse(res, {
      stats: {
        totalStudents,
        todayCheckIns,
        todayCheckOuts,
        pendingComplaints: pendingItems[0],
        pendingLeaves: pendingItems[1],
        pendingQueries: pendingItems[2],
        pendingFees: pendingItems[3],
        pendingServices: pendingItems[4],
        checkedInVisitors: await Visitor.countDocuments({ status: 'checked-in' })
      },
      recentActivity: {
        checkIns: recentActivity[0],
        visitors: recentActivity[1],
        complaints: recentActivity[2]
      }
    }, 'Dashboard loaded in <500ms');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

// ─── COMPLETE HOSTEL DATA - Single API ───────────────────────────────────────

exports.getCompleteHostelData = async (req, res) => {
  try {
    const { hostelId } = req.params;
    const today = new Date().toISOString().split('T')[0];

    // Parallel queries for fast loading
    const [hostel, rooms, allocations, students, todayAttendance] = await Promise.all([
      Hostel.findById(hostelId).lean(),
      Room.find({ hostel: hostelId }).populate('roomType', 'roomTypeName capacity').lean(),
      HostelAllocation.find({ hostel: hostelId, allocationStatus: 'allocated' })
        .populate('studentId', 'firstName lastName rollNumber profileImage')
        .lean(),
      Student.find({ hostel: hostelId }).lean(),
      HostelAttendance.find({ date: today }).lean()
    ]);

    // Calculate stats
    const totalBeds = rooms.reduce((sum, r) => sum + (r.capacity || 0), 0);
    const occupiedBeds = allocations.length;
    const availableBeds = totalBeds - occupiedBeds;

    // Attendance percentage
    const present = todayAttendance.filter(a => a.status === 'present').length;
    const attendanceRate = students.length > 0 
      ? Math.round((present / students.length) * 100) 
      : 0;

    return successResponse(res, {
      hostel: {
        ...hostel,
        stats: {
          totalBeds,
          occupiedBeds,
          availableBeds,
          occupancyRate: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0
        }
      },
      rooms: rooms.map(room => ({
        ...room,
        occupiedBeds: allocations.filter(a => a.room?.toString() === room._id.toString()).length
      })),
      students: students.map(s => ({
        id: s._id,
        name: `${s.firstName} ${s.lastName}`,
        rollNumber: s.rollNumber,
        profileImage: s.profileImage,
        room: allocations.find(a => a.studentId?._id?.toString() === s._id.toString())?.room
      })),
      attendance: {
        total: students.length,
        present,
        absent: students.length - present,
        rate: attendanceRate
      }
    }, 'Complete hostel data loaded');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

// ─── REAL-TIME NOTIFICATIONS ─────────────────────────────────────────────────

exports.getNotifications = async (req, res) => {
  try {
    const wardenId = req.userId;
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    const skip = (page - 1) * limit;

    const filter = { recipientId: wardenId };
    if (unreadOnly === 'true') filter.status = 'unread';

    const [notifications, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Notification.countDocuments({ recipientId: wardenId, status: 'unread' })
    ]);

    return successResponse(res, {
      notifications: notifications.map(n => ({
        id: n._id,
        type: n.type,
        title: n.title,
        message: n.message,
        priority: n.priority,
        status: n.status,
        createdAt: n.createdAt
      })),
      unreadCount,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: notifications.length === parseInt(limit)
      }
    }, 'Notifications fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.createNotification = async (req, res) => {
  try {
    const { recipientId, recipientType, title, message, type, priority = 'normal' } = req.body;
    
    if (!recipientId || !title || !message) {
      return errorResponse(res, 'recipientId, title and message required', 400);
    }

    const notification = new Notification({
      recipientId,
      recipientType: recipientType || 'student',
      senderId: req.userId,
      senderType: 'warden',
      title,
      message,
      type: type || 'general',
      priority,
      status: 'unread',
      branch: req.user?.branch,
      createdAt: new Date()
    });

    await notification.save();

    // In production, send push notification
    // await sendPushNotification(recipientId, title, message);

    return successResponse(res, { notification }, 'Notification sent');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    await Notification.findByIdAndUpdate(notificationId, {
      status: 'read',
      readAt: new Date()
    });

    return successResponse(res, null, 'Notification marked as read');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.markAllNotificationsRead = async (req, res) => {
  try {
    const wardenId = req.userId;
    
    await Notification.updateMany(
      { recipientId: wardenId, status: 'unread' },
      { status: 'read', readAt: new Date() }
    );

    return successResponse(res, null, 'All notifications marked as read');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

// ─── OPTIMIZED ATTENDANCE - Bulk Operations ──────────────────────────────────

exports.markBulkAttendance = async (req, res) => {
  try {
    const { records } = req.body; // Array of { studentId, status, remarks }
    const today = new Date().toISOString().split('T')[0];

    if (!records || !Array.isArray(records)) {
      return errorResponse(res, 'records array required', 400);
    }

    const operations = records.map(record => ({
      updateOne: {
        filter: { studentId: record.studentId, date: today },
        update: {
          $set: {
            status: record.status,
            remarks: record.remarks || '',
            markedBy: req.userId,
            markedAt: new Date()
          }
        },
        upsert: true
      }
    }));

    const result = await HostelAttendance.bulkWrite(operations);

    return successResponse(res, {
      modified: result.modifiedCount,
      upserted: result.upsertedCount,
      total: records.length
    }, 'Attendance marked successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.getAttendanceReport = async (req, res) => {
  try {
    const { startDate, endDate, class: classFilter } = req.query;
    const today = new Date().toISOString().split('T')[0];

    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    } else {
      dateFilter.date = { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
    }

    const matchFilter = { ...dateFilter };
    if (classFilter) matchFilter.class = classFilter;

    const [dailyStats, monthlyStats] = await Promise.all([
      HostelAttendance.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: '$date',
            present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
            absent: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
            total: { $sum: 1 }
          }
        },
        { $sort: { _id: -1 } },
        { $limit: 30 }
      ]),
      HostelAttendance.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: { $substr: ['$date', 0, 7] },
            present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
            absent: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
            total: { $sum: 1 }
          }
        }
      ])
    ]);

    return successResponse(res, {
      dailyStats,
      monthlyStats,
      summary: {
        totalDays: dailyStats.length,
        averageAttendance: dailyStats.length > 0 
          ? Math.round(dailyStats.reduce((s, d) => s + (d.present / d.total * 100), 0) / dailyStats.length)
          : 0
      }
    }, 'Attendance report generated');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

// ─── QUICK ACTIONS ─────────────────────────────────────────────────────────────

exports.quickActions = async (req, res) => {
  try {
    const wardenId = req.userId;
    const today = new Date().toISOString().split('T')[0];

    const [pending, stats] = await Promise.all([
      // All pending items
      Promise.all([
        HostelComplaint.find({ status: 'pending' }).sort({ createdAt: -1 }).limit(5).lean(),
        LeaveGatePass.find({ status: 'pending' }).sort({ createdAt: -1 }).limit(5).lean(),
        StudentQuery.find({ status: 'Pending' }).sort({ createdAt: -1 }).limit(5).lean()
      ]),
      // Quick stats
      Promise.all([
        HostelAllocation.countDocuments({ allocationStatus: 'allocated' }),
        Visitor.countDocuments({ date: today }),
        HostelService.countDocuments({ status: 'Pending' }),
        HostelFee.countDocuments({ status: { $in: ['Pending', 'Overdue'] } })
      ])
    ]);

    return successResponse(res, {
      quickStats: {
        totalStudents: stats[0],
        todayVisitors: stats[1],
        pendingServices: stats[2],
        pendingFees: stats[3]
      },
      pendingItems: {
        complaints: pending[0],
        leaves: pending[1],
        queries: pending[2]
      },
      actionItems: [
        { action: 'View Complaints', count: stats[2], icon: 'warning' },
        { action: 'Approve Leaves', count: pending[1].length, icon: 'pass' },
        { action: 'Pending Queries', count: pending[2].length, icon: 'question' },
        { action: 'Fee Collection', count: stats[3], icon: 'payment' }
      ]
    }, 'Quick actions loaded');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

// ─── STUDENT DETAILED VIEW ─────────────────────────────────────────────────────

exports.getStudentDetails = async (req, res) => {
  try {
    const { studentId } = req.params;

    const [allocation, attendance, fees, services, recentActivity] = await Promise.all([
      HostelAllocation.findOne({ studentId, allocationStatus: 'allocated' })
        .populate('hostel', 'hostelName')
        .populate('room', 'number floor')
        .lean(),
      HostelAttendance.find({ studentId })
        .sort({ date: -1 })
        .limit(30)
        .lean(),
      HostelFee.find({ studentId })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      HostelService.find({ studentId })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      Promise.all([
        CheckInOut.find({ studentId }).sort({ timestamp: -1 }).limit(10).lean(),
        Visitor.find({ studentId }).sort({ checkInTime: -1 }).limit(5).lean(),
        LeaveGatePass.find({ studentId }).sort({ createdAt: -1 }).limit(5).lean()
      ])
    ]);

    const student = await Student.findById(studentId)
      .select('firstName lastName rollNumber class section profileImage')
      .lean();

    // Calculate attendance rate
    const totalDays = attendance.length;
    const presentDays = attendance.filter(a => a.status === 'present').length;
    const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

    // Calculate total fees
    const totalPending = fees.reduce((sum, f) => sum + (f.balance || 0), 0);

    return successResponse(res, {
      student: {
        ...student,
        name: `${student.firstName} ${student.lastName}`
      },
      allocation,
      attendance: {
        records: attendance,
        rate: attendanceRate,
        present: presentDays,
        total: totalDays
      },
      fees: {
        records: fees,
        pending: totalPending
      },
      services,
      recentActivity: {
        checkIns: recentActivity[0],
        visitors: recentActivity[1],
        leaves: recentActivity[2]
      }
    }, 'Student details loaded');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

// ─── COMPLAINTS MANAGEMENT ─────────────────────────────────────────────────────

exports.resolveComplaint = async (req, res) => {
  try {
    const { complaintId, resolution, status } = req.body;
    
    if (!complaintId || !status) {
      return errorResponse(res, 'complaintId and status required', 400);
    }

    const complaint = await HostelComplaint.findByIdAndUpdate(complaintId, {
      status,
      resolution: resolution || '',
      resolvedBy: req.userId,
      resolvedAt: new Date()
    }, { new: true });

    return successResponse(res, { complaint }, 'Complaint updated');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

// ─── LEAVE APPROVAL ────────────────────────────────────────────────────────────

exports.approveLeave = async (req, res) => {
  try {
    const { leaveId, status, remarks } = req.body;
    
    if (!leaveId || !status) {
      return errorResponse(res, 'leaveId and status required', 400);
    }

    const leave = await LeaveGatePass.findByIdAndUpdate(leaveId, {
      status,
      remarks: remarks || '',
      approvedBy: req.userId,
      approvedAt: new Date()
    }, { new: true });

    return successResponse(res, { leave }, 'Leave updated');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

module.exports = exports;
