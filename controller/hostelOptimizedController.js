const Hostel = require('../model/Hostel');
const Room = require('../model/Room');
const HostelAllocation = require('../model/HostelAllocation');
const Student = require('../model/Student');

exports.getHostelStats = async (req, res) => {
  try {
    const { branch } = req.query;
    const adminBranch = req.user.branch;

    const stats = await Room.aggregate([
      { $match: { branch: adminBranch || branch } },
      {
        $facet: {
          totalRooms: [{ $count: 'count' }],
          occupied: [{ $match: { occupancy: { $gt: 0 } } }, { $count: 'count' }],
          vacant: [{ $match: { occupancy: 0 } }, { $count: 'count' }],
          totalCapacity: [{ $group: { _id: null, total: { $sum: '$capacity' } } }],
          totalOccupancy: [{ $group: { _id: null, total: { $sum: '$occupancy' } } }]
        }
      }
    ]);

    const hostelCount = await Hostel.countDocuments({ branch: adminBranch || branch });

    res.status(200).json({
      success: true,
      data: {
        hostels: hostelCount,
        rooms: {
          total: stats[0].totalRooms[0]?.count || 0,
          occupied: stats[0].occupied[0]?.count || 0,
          vacant: stats[0].vacant[0]?.count || 0,
          totalCapacity: stats[0].totalCapacity[0]?.total || 0,
          totalOccupancy: stats[0].totalOccupancy[0]?.total || 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getHostels = async (req, res) => {
  try {
    const { branch, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    const adminBranch = req.user.branch;

    const [hostels, total] = await Promise.all([
      Hostel.find({ branch: adminBranch || branch })
        .select('name address warden capacity status createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Hostel.countDocuments({ branch: adminBranch || branch })
    ]);

    res.status(200).json({
      success: true,
      data: hostels,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getRooms = async (req, res) => {
  try {
    const { branch, hostelId, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    const adminBranch = req.user.branch;

    const query = { branch: adminBranch || branch };
    if (hostelId) query.hostelId = hostelId;

    const [rooms, total] = await Promise.all([
      Room.find(query)
        .select('roomNumber capacity occupancy status createdAt')
        .sort({ roomNumber: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Room.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: rooms,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllocations = async (req, res) => {
  try {
    const { branch, limit = 10 } = req.query;
    const adminBranch = req.user.branch;

    const allocations = await HostelAllocation.aggregate([
      { $match: { branch: adminBranch || branch } },
      {
        $lookup: {
          from: 'students',
          localField: 'studentId',
          foreignField: '_id',
          as: 'studentDetails'
        }
      },
      {
        $lookup: {
          from: 'rooms',
          localField: 'roomId',
          foreignField: '_id',
          as: 'roomDetails'
        }
      },
      {
        $project: {
          _id: 1,
          studentName: { $arrayElemAt: ['$studentDetails.firstName', 0] },
          studentEmail: { $arrayElemAt: ['$studentDetails.email', 0] },
          roomNumber: { $arrayElemAt: ['$roomDetails.roomNumber', 0] },
          allocationDate: 1,
          status: 1
        }
      },
      { $sort: { allocationDate: -1 } },
      { $limit: parseInt(limit) }
    ]);

    res.status(200).json({ success: true, data: allocations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getVacantRooms = async (req, res) => {
  try {
    const { branch, hostelId } = req.query;
    const adminBranch = req.user.branch;

    const query = { branch: adminBranch || branch, occupancy: { $lt: { $ref: 'capacity' } } };
    if (hostelId) query.hostelId = hostelId;

    const vacant = await Room.aggregate([
      {
        $match: {
          branch: adminBranch || branch,
          $expr: { $lt: ['$occupancy', '$capacity'] }
        }
      },
      {
        $project: {
          _id: 1,
          roomNumber: 1,
          capacity: 1,
          occupancy: 1,
          available: { $subtract: ['$capacity', '$occupancy'] }
        }
      },
      { $sort: { roomNumber: 1 } }
    ]);

    res.status(200).json({ success: true, data: vacant });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getHostelDashboard = async (req, res) => {
  try {
    const adminBranch = req.user.branch;

    const [roomStats, hostelCount, allocations, recentAllocations] = await Promise.all([
      Room.aggregate([
        { $match: { branch: adminBranch } },
        {
          $facet: {
            total: [{ $count: 'count' }],
            occupied: [{ $match: { occupancy: { $gt: 0 } } }, { $count: 'count' }],
            vacant: [{ $match: { occupancy: 0 } }, { $count: 'count' }]
          }
        }
      ]),
      Hostel.countDocuments({ branch: adminBranch }),
      HostelAllocation.countDocuments({ branch: adminBranch }),
      HostelAllocation.find({ branch: adminBranch })
        .select('studentId roomId allocationDate')
        .sort({ allocationDate: -1 })
        .limit(5)
        .lean()
    ]);

    res.status(200).json({
      success: true,
      data: {
        rooms: {
          total: roomStats[0].total[0]?.count || 0,
          occupied: roomStats[0].occupied[0]?.count || 0,
          vacant: roomStats[0].vacant[0]?.count || 0
        },
        hostels: hostelCount,
        allocations,
        recentAllocations: recentAllocations.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
