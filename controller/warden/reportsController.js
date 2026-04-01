const Hostel = require('../../model/Hostel');
const Room = require('../../model/Room');
const RoomType = require('../../model/RoomType');
const HostelAllocation = require('../../model/HostelAllocation');
const HostelFee = require('../../model/HostelFee');
const HostelAttendance = require('../../model/HostelAttendance');
const HostelComplaint = require('../../model/HostelComplaint');
const { successResponse, errorResponse } = require('../../responseFormatter');

exports.getOverview = async (req, res) => {
  try {
    const [
      totalStudents,
      totalRooms,
      availableRooms,
      occupiedRooms,
      feeData,
      newAdmissions
    ] = await Promise.all([
      HostelAllocation.countDocuments({ allocationStatus: 'allocated' }),
      Room.countDocuments(),
      Room.countDocuments({ status: 'available' }),
      Room.countDocuments({ status: 'occupied' }),
      HostelFee.aggregate([
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$paidAmount' },
            pendingAmount: { $sum: { $subtract: ['$totalAmount', '$paidAmount'] } }
          }
        }
      ]),
      HostelAllocation.countDocuments({
        createdAt: { $gte: new Date(new Date().setDate(1)) } // this month
      })
    ]);

    const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
    const totalRevenue = feeData[0]?.totalRevenue || 0;
    const pendingAmount = feeData[0]?.pendingAmount || 0;

    return successResponse(res, {
      totalStudents,
      totalRooms,
      availableRooms,
      occupiedRooms,
      occupancyRate,
      totalRevenue,
      pendingAmount,
      newAdmissions
    }, 'Overview fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.getHostelWise = async (req, res) => {
  try {
    const hostels = await Hostel.find().lean();
    const hostelData = await Promise.all(
      hostels.map(async (h) => {
        const [students, rooms] = await Promise.all([
          HostelAllocation.countDocuments({ hostel: h._id, allocationStatus: 'allocated' }),
          Room.countDocuments({ hostel: h._id })
        ]);
        const feeAgg = await HostelFee.aggregate([
          { $group: { _id: null, revenue: { $sum: '$paidAmount' } } }
        ]);
        return {
          name: h.hostelName,
          students,
          capacity: h.totalCapacity || rooms,
          revenue: feeAgg[0]?.revenue || 0,
          occupancy: rooms > 0 ? Math.round((students / rooms) * 100) : 0
        };
      })
    );
    return successResponse(res, hostelData, 'Hostel wise report fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.getRoomTypeWise = async (req, res) => {
  try {
    const roomTypes = await RoomType.find().lean();
    const data = await Promise.all(
      roomTypes.map(async (rt) => {
        const [total, occupied] = await Promise.all([
          Room.countDocuments({ roomType: rt._id }),
          Room.countDocuments({ roomType: rt._id, status: 'occupied' })
        ]);
        const feeAgg = await HostelFee.aggregate([
          { $group: { _id: null, revenue: { $sum: '$paidAmount' } } }
        ]);
        return {
          type: rt.roomTypeName || rt.name,
          count: total,
          occupied,
          revenue: feeAgg[0]?.revenue || 0
        };
      })
    );
    return successResponse(res, data, 'Room type wise report fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.getMonthlyTrend = async (req, res) => {
  try {
    const trend = await HostelFee.aggregate([
      {
        $group: {
          _id: '$month',
          revenue: { $sum: '$paidAmount' },
          students: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 6 }
    ]);
    return successResponse(res, trend, 'Monthly trend fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.getRevenueReport = async (req, res) => {
  try {
    const [totalRevenue, pendingAmount, collectionRate, hostelRevenue] = await Promise.all([
      HostelFee.aggregate([{ $group: { _id: null, total: { $sum: '$paidAmount' } } }]),
      HostelFee.aggregate([{ $group: { _id: null, total: { $sum: { $subtract: ['$totalAmount', '$paidAmount'] } } } }]),
      HostelFee.aggregate([
        {
          $group: {
            _id: null,
            paid: { $sum: { $cond: [{ $eq: ['$status', 'Paid'] }, 1, 0] } },
            total: { $sum: 1 }
          }
        }
      ]),
      Hostel.find().lean()
    ]);

    const rate = collectionRate[0] ? Math.round((collectionRate[0].paid / collectionRate[0].total) * 100) : 0;

    return successResponse(res, {
      totalRevenue: totalRevenue[0]?.total || 0,
      pendingAmount: pendingAmount[0]?.total || 0,
      collectionRate: rate,
      hostelCount: hostelRevenue.length
    }, 'Revenue report fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};
