const Vehicle = require('../../model/Vehicle');
const Route = require('../../model/Route');
const Driver = require('../../model/Driver');
const TransportAllocation = require('../../model/TransportAllocation');
const mongoose = require('mongoose');

exports.getTransportStats = async (req, res) => {
  try {
    const { branch } = req.query;
    const adminBranch = req.user.branch ? new mongoose.Types.ObjectId(req.user.branch) : null;
    const adminClient = req.user.client ? new mongoose.Types.ObjectId(req.user.client) : null;
    const matchQ = adminBranch ? { branch: adminBranch } : branch ? { branch: new mongoose.Types.ObjectId(branch) } : adminClient ? { client: adminClient } : {};

    const stats = await Vehicle.aggregate([
      { $match: matchQ },
      {
        $facet: {
          total: [{ $count: 'count' }],
          active: [{ $match: { status: true } }, { $count: 'count' }],
          maintenance: [{ $match: { status: false } }, { $count: 'count' }],
          totalCapacity: [{ $group: { _id: null, total: { $sum: '$capacity' } } }]
        }
      }
    ]);

    const routeStats = await Route.aggregate([
      { $match: matchQ },
      { $count: 'count' }
    ]);

    const driverStats = await Driver.aggregate([
      { $match: matchQ },
      {
        $facet: {
          total: [{ $count: 'count' }],
          active: [{ $match: { status: true } }, { $count: 'count' }]
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        vehicles: {
          total: stats[0].total[0]?.count || 0,
          active: stats[0].active[0]?.count || 0,
          maintenance: stats[0].maintenance[0]?.count || 0,
          totalCapacity: stats[0].totalCapacity[0]?.total || 0
        },
        routes: routeStats[0]?.count || 0,
        drivers: {
          total: driverStats[0].total[0]?.count || 0,
          active: driverStats[0].active[0]?.count || 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getVehicles = async (req, res) => {
  try {
    const { branch, page = 1, limit = 20, status = 'all' } = req.query;
    const skip = (page - 1) * limit;
    const adminBranch = req.user.branch ? new mongoose.Types.ObjectId(req.user.branch) : null;
    const adminClient = req.user.client ? new mongoose.Types.ObjectId(req.user.client) : null;

    const query = {};
    if (adminBranch) query.branch = adminBranch;
    else if (branch) query.branch = new mongoose.Types.ObjectId(branch);
    else if (adminClient) query.client = adminClient;
    if (status !== 'all') query.status = status === 'active';

    const [vehicles, total] = await Promise.all([
      Vehicle.find(query)
        .select('vehicleNumber registrationNumber capacity status createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Vehicle.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: vehicles,
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

exports.getRoutes = async (req, res) => {
  try {
    const { branch, limit = 10 } = req.query;
    const adminBranch = req.user.branch ? new mongoose.Types.ObjectId(req.user.branch) : null;
    const adminClient = req.user.client ? new mongoose.Types.ObjectId(req.user.client) : null;
    const matchQ = adminBranch ? { branch: adminBranch } : branch ? { branch: new mongoose.Types.ObjectId(branch) } : adminClient ? { client: adminClient } : {};

    const routes = await Route.aggregate([
      { $match: matchQ },
      {
        $lookup: {
          from: 'vehicles',
          localField: 'vehicleId',
          foreignField: '_id',
          as: 'vehicleDetails'
        }
      },
      {
        $lookup: {
          from: 'drivers',
          localField: 'driverId',
          foreignField: '_id',
          as: 'driverDetails'
        }
      },
      {
        $project: {
          _id: 1,
          routeName: 1,
          startPoint: 1,
          endPoint: 1,
          vehicleNumber: { $arrayElemAt: ['$vehicleDetails.vehicleNumber', 0] },
          driverName: { $arrayElemAt: ['$driverDetails.name', 0] },
          stops: { $size: '$stops' }
        }
      },
      { $limit: parseInt(limit) }
    ]);

    res.status(200).json({ success: true, data: routes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getDrivers = async (req, res) => {
  try {
    const { branch, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    const adminBranch = req.user.branch ? new mongoose.Types.ObjectId(req.user.branch) : null;
    const adminClient = req.user.client ? new mongoose.Types.ObjectId(req.user.client) : null;
    const q = adminBranch ? { branch: adminBranch } : branch ? { branch: new mongoose.Types.ObjectId(branch) } : adminClient ? { client: adminClient } : {};

    const [drivers, total] = await Promise.all([
      Driver.find(q)
        .select('name email mobile licenseNumber status createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Driver.countDocuments(q)
    ]);

    res.status(200).json({
      success: true,
      data: drivers,
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

exports.getStudentAllocations = async (req, res) => {
  try {
    const { branch, limit = 10 } = req.query;
    const adminBranch = req.user.branch;

    const allocations = await TransportAllocation.aggregate([
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
          from: 'routes',
          localField: 'routeId',
          foreignField: '_id',
          as: 'routeDetails'
        }
      },
      {
        $project: {
          _id: 1,
          studentName: { $arrayElemAt: ['$studentDetails.firstName', 0] },
          studentEmail: { $arrayElemAt: ['$studentDetails.email', 0] },
          routeName: { $arrayElemAt: ['$routeDetails.routeName', 0] },
          status: 1,
          createdAt: 1
        }
      },
      { $limit: parseInt(limit) }
    ]);

    res.status(200).json({ success: true, data: allocations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTransportDashboard = async (req, res) => {
  try {
    const adminBranch = req.user.branch ? new mongoose.Types.ObjectId(req.user.branch) : null;
    const adminClient = req.user.client ? new mongoose.Types.ObjectId(req.user.client) : null;
    const matchQ = adminBranch ? { branch: adminBranch } : adminClient ? { client: adminClient } : {};

    const [vehicleStats, routeCount, driverStats, allocations] = await Promise.all([
      Vehicle.aggregate([{ $match: matchQ }, { $facet: { total: [{ $count: 'count' }], active: [{ $match: { status: true } }, { $count: 'count' }] } }]),
      Route.countDocuments(matchQ),
      Driver.aggregate([{ $match: matchQ }, { $facet: { total: [{ $count: 'count' }], active: [{ $match: { status: true } }, { $count: 'count' }] } }]),
      TransportAllocation.find(matchQ).select('studentId routeId status').limit(5).lean()
    ]);

    res.status(200).json({
      success: true,
      data: {
        vehicles: {
          total: vehicleStats[0].total[0]?.count || 0,
          active: vehicleStats[0].active[0]?.count || 0
        },
        routes: routeCount,
        drivers: {
          total: driverStats[0].total[0]?.count || 0,
          active: driverStats[0].active[0]?.count || 0
        },
        recentAllocations: allocations.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
