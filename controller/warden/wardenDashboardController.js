const Hostel = require('../../model/Hostel');
const Room = require('../../model/Room');
const RoomType = require('../../model/RoomType');
const Warden = require('../../model/Warden');
const HostelAllocation = require('../../model/HostelAllocation');
const HostelAttendance = require('../../model/HostelAttendance');
const HostelComplaint = require('../../model/HostelComplaint');
const CheckInOut = require('../../model/CheckInOut');
const Visitor = require('../../model/Visitor');
const LeaveGatePass = require('../../model/LeaveGatePass');
const HostelFee = require('../../model/HostelFee');
const StudentQuery = require('../../model/StudentQuery');
const { successResponse, errorResponse } = require('../../responseFormatter');

// Single call - returns everything needed for dashboard
exports.getDashboardData = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [
      totalRooms,
      availableRooms,
      totalAllocations,
      todayCheckIns,
      todayCheckOuts,
      pendingComplaints,
      pendingLeaves,
      pendingQueries,
      checkedInVisitors,
      pendingFees,
      recentCheckIns
    ] = await Promise.all([
      Room.countDocuments(),
      Room.countDocuments({ status: 'available' }),
      HostelAllocation.countDocuments({ allocationStatus: 'allocated' }),
      CheckInOut.countDocuments({ date: today, action: 'checkin' }),
      CheckInOut.countDocuments({ date: today, action: 'checkout' }),
      HostelComplaint.countDocuments({ status: 'pending' }),
      LeaveGatePass.countDocuments({ status: 'pending' }),
      StudentQuery.countDocuments({ status: 'Pending' }),
      Visitor.countDocuments({ status: 'checked-in' }),
      HostelFee.countDocuments({ status: { $in: ['Pending', 'Overdue'] } }),
      CheckInOut.find({ date: today }).sort({ timestamp: -1 }).limit(5).lean()
    ]);

    return successResponse(res, {
      stats: {
        totalRooms,
        availableRooms,
        occupiedRooms: totalRooms - availableRooms,
        totalAllocations,
        todayCheckIns,
        todayCheckOuts,
        pendingComplaints,
        pendingLeaves,
        pendingQueries,
        checkedInVisitors,
        pendingFees
      },
      recentActivity: recentCheckIns
    }, 'Dashboard data fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

// Rooms with room types in one call
exports.getRoomsWithTypes = async (req, res) => {
  try {
    const [rooms, roomTypes] = await Promise.all([
      Room.find().sort({ number: 1 }).lean(),
      RoomType.find().lean()
    ]);
    return successResponse(res, { rooms, roomTypes }, 'Fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

// Wardens list
exports.getWardens = async (req, res) => {
  try {
    const wardens = await Warden.find().sort({ createdAt: -1 }).lean();
    return successResponse(res, wardens, 'Wardens fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

// Hostels list
exports.getHostels = async (req, res) => {
  try {
    const hostels = await Hostel.find().sort({ createdAt: -1 }).lean();
    return successResponse(res, hostels, 'Hostels fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

// Allocations list
exports.getAllocations = async (req, res) => {
  try {
    const allocations = await HostelAllocation.find()
      .populate('hostel', 'hostelName hostelCode')
      .sort({ createdAt: -1 })
      .lean();
    return successResponse(res, allocations, 'Allocations fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

// Floor tracking - rooms + roomTypes + bedAllocations in one call
exports.getFloorTracking = async (req, res) => {
  try {
    const BedAllocation = require('../../model/BedAllocation');
    const { floor, status } = req.query;

    const roomFilter = {};
    if (floor) roomFilter.floor = parseInt(floor);
    if (status) roomFilter.status = status;

    const [rooms, roomTypes, bedAllocations] = await Promise.all([
      Room.find(roomFilter).sort({ floor: 1, number: 1 }).lean(),
      RoomType.find().lean(),
      BedAllocation.find({ status: 'active' }).lean()
    ]);

    // Group rooms by floor
    const floorMap = {};
    rooms.forEach(room => {
      const f = room.floor || 1;
      if (!floorMap[f]) floorMap[f] = [];
      const roomBeds = bedAllocations.filter(b => b.roomId === room._id.toString() || b.roomId === room.id?.toString());
      const roomType = roomTypes.find(rt => rt._id.toString() === (room.roomType || room.typeId)?.toString());
      floorMap[f].push({
        ...room,
        roomTypeName: roomType?.roomTypeName || roomType?.name || 'N/A',
        occupiedBeds: roomBeds.length,
        availableBeds: (room.capacity || 0) - roomBeds.length,
        allocatedStudents: roomBeds
      });
    });

    // Stats
    const totalBeds = rooms.reduce((s, r) => s + (r.capacity || 0), 0);
    const occupiedBeds = bedAllocations.length;

    return successResponse(res, {
      floors: floorMap,
      roomTypes,
      stats: {
        totalRooms: rooms.length,
        totalBeds,
        occupiedBeds,
        availableBeds: totalBeds - occupiedBeds,
        totalStudents: occupiedBeds
      }
    }, 'Floor tracking data fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};
