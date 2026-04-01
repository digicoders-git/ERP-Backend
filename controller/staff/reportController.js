const Hostel = require('../../model/Hostel');
const HostelAllocation = require('../../model/HostelAllocation');
const Room = require('../../model/Room');
const Warden = require('../../model/Warden');
const Vehicle = require('../../model/Vehicle');
const Route = require('../../model/Route');
const TransportAllocation = require('../../model/TransportAllocation');
const Driver = require('../../model/Driver');
const Admin = require('../../model/Admin');

const getBranch = async (userId) => {
  const admin = await Admin.findById(userId).select('branch').lean();
  return admin?.branch || null;
};

// Hostel Dashboard
exports.getHostelDashboard = async (req, res) => {
  try {
    const branch = await getBranch(req.userId);

    const [
      totalHostels,
      totalRooms,
      occupiedRooms,
      totalAllocations,
      totalWardens,
      recentAllocations,
      hostelWiseData
    ] = await Promise.all([
      Hostel.countDocuments({ branch }),
      Room.countDocuments({ branch }),
      Room.countDocuments({ branch, status: 'occupied' }),
      HostelAllocation.countDocuments({ branch, allocationStatus: 'allocated' }),
      Warden.countDocuments({ branch }),
      HostelAllocation.find({ branch })
        .populate('hostel', 'hostelName type')
        .sort({ createdAt: -1 })
        .limit(10)
        .select('studentId studentName roomNo joiningDate monthlyRent allocationStatus hostel')
        .lean(),
      Hostel.aggregate([
        { $match: { branch } },
        {
          $lookup: {
            from: 'hostelallocations',
            localField: '_id',
            foreignField: 'hostel',
            as: 'allocations'
          }
        },
        {
          $lookup: {
            from: 'rooms',
            localField: '_id',
            foreignField: 'hostel',
            as: 'rooms'
          }
        },
        {
          $project: {
            hostelName: 1,
            type: 1,
            totalFloor: 1,
            totalRooms: { $size: '$rooms' },
            occupiedRooms: {
              $size: {
                $filter: {
                  input: '$rooms',
                  as: 'r',
                  cond: { $eq: ['$$r.status', 'occupied'] }
                }
              }
            },
            totalAllocations: { $size: '$allocations' }
          }
        }
      ])
    ]);

    res.status(200).json({
      stats: {
        totalHostels,
        totalRooms,
        occupiedRooms,
        availableRooms: totalRooms - occupiedRooms,
        occupancyRate: totalRooms > 0 ? `${((occupiedRooms / totalRooms) * 100).toFixed(1)}%` : '0%',
        totalAllocations,
        totalWardens
      },
      recentAllocations,
      hostelWiseData
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Hostel Report
exports.getHostelReport = async (req, res) => {
  try {
    const branch = await getBranch(req.userId);
    const { hostelId, fromDate, toDate } = req.query;

    const query = { branch };
    if (hostelId) query.hostel = hostelId;
    if (fromDate && toDate) {
      query.createdAt = { $gte: new Date(fromDate), $lte: new Date(toDate) };
    }

    const [allocations, hostels] = await Promise.all([
      HostelAllocation.find(query)
        .populate('hostel', 'hostelName type')
        .sort({ createdAt: -1 })
        .lean(),
      Hostel.find({ branch }).select('hostelName type totalFloor contactNo').lean()
    ]);

    res.status(200).json({
      allocations,
      hostels,
      summary: {
        totalAllocations: allocations.length,
        activeAllocations: allocations.filter(a => a.allocationStatus === 'allocated').length,
        cancelledAllocations: allocations.filter(a => a.allocationStatus === 'cancelled').length
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Transport Dashboard
exports.getTransportDashboard = async (req, res) => {
  try {
    const branch = await getBranch(req.userId);

    const [
      totalVehicles,
      activeVehicles,
      totalDrivers,
      activeDrivers,
      totalRoutes,
      totalAllocations,
      recentAllocations,
      vehicleWiseData
    ] = await Promise.all([
      Vehicle.countDocuments({ branch }),
      Vehicle.countDocuments({ branch, status: true }),
      Driver.countDocuments({ branch }),
      Driver.countDocuments({ branch, status: true }),
      Route.countDocuments({ branch }),
      TransportAllocation.countDocuments({ branch, status: true }),
      TransportAllocation.find({ branch })
        .populate('route', 'routeName')
        .populate('vehicle', 'vehicleNo vehicleType')
        .populate('routeStop', 'stopName')
        .sort({ createdAt: -1 })
        .limit(10)
        .select('userName userType service monthlyCharges joiningDate route vehicle routeStop status')
        .lean(),
      Vehicle.aggregate([
        { $match: { branch } },
        {
          $lookup: {
            from: 'transportallocations',
            localField: '_id',
            foreignField: 'vehicle',
            as: 'allocations'
          }
        },
        {
          $project: {
            vehicleNo: 1,
            vehicleType: 1,
            vehicleCapacity: 1,
            status: 1,
            totalAllocations: { $size: '$allocations' },
            availableSeats: {
              $subtract: ['$vehicleCapacity', { $size: '$allocations' }]
            }
          }
        }
      ])
    ]);

    res.status(200).json({
      stats: {
        totalVehicles,
        activeVehicles,
        totalDrivers,
        activeDrivers,
        totalRoutes,
        totalAllocations
      },
      recentAllocations,
      vehicleWiseData
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Transport Report
exports.getTransportReport = async (req, res) => {
  try {
    const branch = await getBranch(req.userId);
    const { routeId, vehicleId, fromDate, toDate } = req.query;

    const query = { branch };
    if (routeId) query.route = routeId;
    if (vehicleId) query.vehicle = vehicleId;
    if (fromDate && toDate) {
      query.createdAt = { $gte: new Date(fromDate), $lte: new Date(toDate) };
    }

    const [allocations, routes, vehicles] = await Promise.all([
      TransportAllocation.find(query)
        .populate('route', 'routeName startPoint endPoint')
        .populate('vehicle', 'vehicleNo vehicleType vehicleCapacity')
        .populate('routeStop', 'stopName pickupTime dropTime')
        .sort({ createdAt: -1 })
        .lean(),
      Route.find({ branch }).select('routeName routeCode startPoint endPoint totalDistance').lean(),
      Vehicle.find({ branch }).select('vehicleNo vehicleType vehicleCapacity').lean()
    ]);

    res.status(200).json({
      allocations,
      routes,
      vehicles,
      summary: {
        totalAllocations: allocations.length,
        activeAllocations: allocations.filter(a => a.status === true).length,
        inactiveAllocations: allocations.filter(a => a.status === false).length
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Attendance Report
exports.getAttendanceReport = async (req, res) => {
  try {
    const branch = await getBranch(req.userId);
    const { classId, section, fromDate, toDate, page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const Attendance = require('../../model/Attendance');

    const query = { branch, type: 'student' };
    if (classId) query.classId = classId;
    if (section) query.sectionId = section;
    if (fromDate && toDate) {
      query.date = { $gte: new Date(fromDate), $lte: new Date(toDate) };
    }

    const [attendanceRecords, total, stats] = await Promise.all([
      Attendance.find(query)
        .populate('studentId', 'firstName lastName admissionNumber rollNumber')
        .populate('classId', 'className')
        .populate('sectionId', 'sectionName')
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Attendance.countDocuments(query),
      Attendance.aggregate([
        { $match: query },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);

    const statsMap = { present: 0, absent: 0, late: 0, 'half-day': 0 };
    stats.forEach(s => { statsMap[s._id] = s.count; });

    res.status(200).json({
      attendanceRecords,
      summary: { total, ...statsMap },
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
