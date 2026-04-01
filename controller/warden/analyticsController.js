const Room = require('../../model/Room');
const RoomType = require('../../model/RoomType');
const HostelAllocation = require('../../model/HostelAllocation');
const HostelAttendance = require('../../model/HostelAttendance');
const MessAttendance = require('../../model/MessAttendance');
const HostelComplaint = require('../../model/HostelComplaint');
const CheckInOut = require('../../model/CheckInOut');
const EntryExit = require('../../model/EntryExit');
const HostelFee = require('../../model/HostelFee');
const LeaveGatePass = require('../../model/LeaveGatePass');
const { successResponse,  errorResponse } = require('../../responseFormatter');

exports.getAnalytics = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Run all queries in parallel
    const [
      totalRooms,
      availableRooms,
      occupiedRooms,
      totalAllocations,
      // Attendance last 7 days
      attendanceLast7,
      // Mess last 7 days
      messLast7,
      // Complaints by status
      complaintStats,
      // Today check-ins
      todayCheckIns,
      todayCheckOuts,
      // Fee stats
      feeData,
      // Leave stats
      leaveStats
    ] = await Promise.all([
      Room.countDocuments(),
      Room.countDocuments({ status: 'available' }),
      Room.countDocuments({ status: 'occupied' }),
      HostelAllocation.countDocuments({ allocationStatus: 'allocated' }),

      // Attendance grouped by date (last 7 days)
      HostelAttendance.aggregate([
        { $group: { _id: { date: '$date', status: '$status' }, count: { $sum: 1 } } },
        { $sort: { '_id.date': -1 } },
        { $limit: 14 }
      ]),

      // Mess attendance grouped by date
      MessAttendance.aggregate([
        {
          $group: {
            _id: '$date',
            breakfast: { $sum: { $cond: ['$breakfast', 1, 0] } },
            lunch: { $sum: { $cond: ['$lunch', 1, 0] } },
            dinner: { $sum: { $cond: ['$dinner', 1, 0] } }
          }
        },
        { $sort: { _id: -1 } },
        { $limit: 7 }
      ]),

      // Complaints by status
      HostelComplaint.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),

      CheckInOut.countDocuments({ date: today, action: 'checkin' }),
      CheckInOut.countDocuments({ date: today, action: 'checkout' }),

      // Fee summary
      HostelFee.aggregate([
        {
          $group: {
            _id: '$status',
            total: { $sum: '$totalAmount' },
            paid: { $sum: '$paidAmount' },
            count: { $sum: 1 }
          }
        }
      ]),

      // Leave stats
      LeaveGatePass.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);

    // Format attendance trend (last 7 days)
    const attendanceMap = {};
    attendanceLast7.forEach(item => {
      const date = item._id.date;
      if (!attendanceMap[date]) attendanceMap[date] = { date, present: 0, absent: 0 };
      attendanceMap[date][item._id.status] = item.count;
    });
    const attendanceTrend = Object.values(attendanceMap).slice(0, 7).reverse();

    // Format complaint stats
    const complaints = { pending: 0, resolved: 0, 'in-progress': 0 };
    complaintStats.forEach(c => { complaints[c._id] = c.count; });

    // Format fee stats
    const fees = { Paid: { total: 0, count: 0 }, Pending: { total: 0, count: 0 }, Overdue: { total: 0, count: 0 } };
    feeData.forEach(f => { if (fees[f._id]) fees[f._id] = { total: f.total, count: f.count }; });

    // Format leave stats
    const leaves = { pending: 0, approved: 0, rejected: 0 };
    leaveStats.forEach(l => { leaves[l._id] = l.count; });

    // Occupancy rate
    const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    return successResponse(res, {
      rooms: { total: totalRooms, available: availableRooms, occupied: occupiedRooms, occupancyRate },
      allocations: totalAllocations,
      attendance: { trend: attendanceTrend },
      mess: { weekly: messLast7.reverse() },
      complaints,
      today: { checkIns: todayCheckIns, checkOuts: todayCheckOuts },
      fees,
      leaves
    }, 'Analytics fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};
