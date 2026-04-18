const Vehicle = require('../../model/Vehicle');
const Route = require('../../model/Route');
const Driver = require('../../model/Driver');
const TransportAllocation = require('../../model/TransportAllocation');
const RouteStop = require('../../model/RouteStop');
const mongoose = require('mongoose');

// Dashboard
exports.getDashboard = async (req, res) => {
  try {
    const adminBranch = req.user.branch ? new mongoose.Types.ObjectId(req.user.branch) : null;
    const adminClient = req.user.client ? new mongoose.Types.ObjectId(req.user.client) : null;
    const matchQ = adminBranch ? { branch: adminBranch } : adminClient ? { client: adminClient } : {};

    const [vehicleStats, routeCount, driverStats, allocations] = await Promise.all([
      Vehicle.aggregate([
        { $match: matchQ },
        {
          $facet: {
            total: [{ $count: 'count' }],
            active: [{ $match: { status: true } }, { $count: 'count' }]
          }
        }
      ]),
      Route.countDocuments(matchQ),
      Driver.aggregate([
        { $match: matchQ },
        {
          $facet: {
            total: [{ $count: 'count' }],
            active: [{ $match: { status: true } }, { $count: 'count' }]
          }
        }
      ]),
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

// Stats
exports.getStats = async (req, res) => {
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

// Get Vehicles
exports.getVehicles = async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'all' } = req.query;
    const skip = (page - 1) * limit;
    const adminBranch = req.user.branch ? new mongoose.Types.ObjectId(req.user.branch) : null;
    const adminClient = req.user.client ? new mongoose.Types.ObjectId(req.user.client) : null;

    const query = {};
    if (adminBranch) query.branch = adminBranch;
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

// Get Vehicle By ID
exports.getVehicleById = async (req, res) => {
  try {
    const { id } = req.params;
    const vehicle = await Vehicle.findById(id);

    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    res.status(200).json({ success: true, data: vehicle });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Drivers
exports.getDrivers = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    const adminBranch = req.user.branch ? new mongoose.Types.ObjectId(req.user.branch) : null;
    const adminClient = req.user.client ? new mongoose.Types.ObjectId(req.user.client) : null;
    const q = adminBranch ? { branch: adminBranch } : adminClient ? { client: adminClient } : {};

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

// Get Driver By ID
exports.getDriverById = async (req, res) => {
  try {
    const { id } = req.params;
    const driver = await Driver.findById(id);

    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    res.status(200).json({ success: true, data: driver });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Routes
exports.getRoutes = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    const adminBranch = req.user.branch ? new mongoose.Types.ObjectId(req.user.branch) : null;
    const adminClient = req.user.client ? new mongoose.Types.ObjectId(req.user.client) : null;
    const matchQ = adminBranch ? { branch: adminBranch } : adminClient ? { client: adminClient } : {};

    const [routes, total] = await Promise.all([
      Route.aggregate([
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
            stops: { $size: '$stops' },
            createdAt: 1
          }
        },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: parseInt(limit) }
      ]),
      Route.countDocuments(matchQ)
    ]);

    res.status(200).json({
      success: true,
      data: routes,
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

// Get Route By ID
exports.getRouteById = async (req, res) => {
  try {
    const { id } = req.params;
    const route = await Route.findById(id)
      .populate('vehicleId')
      .populate('driverId');

    if (!route) {
      return res.status(404).json({ success: false, message: 'Route not found' });
    }

    res.status(200).json({ success: true, data: route });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Route Stops
exports.getRouteStops = async (req, res) => {
  try {
    const { routeId } = req.params;
    const stops = await RouteStop.find({ routeId }).sort({ stopOrder: 1 });

    res.status(200).json({ success: true, data: stops });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Allocations
exports.getAllocations = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    const adminBranch = req.user.branch ? new mongoose.Types.ObjectId(req.user.branch) : null;
    const adminClient = req.user.client ? new mongoose.Types.ObjectId(req.user.client) : null;
    const matchQ = adminBranch ? { branch: adminBranch } : adminClient ? { client: adminClient } : {};

    const [allocations, total] = await Promise.all([
      TransportAllocation.aggregate([
        { $match: matchQ },
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
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: parseInt(limit) }
      ]),
      TransportAllocation.countDocuments(matchQ)
    ]);

    res.status(200).json({
      success: true,
      data: allocations,
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

// Get Allocation By ID
exports.getAllocationById = async (req, res) => {
  try {
    const { id } = req.params;
    const allocation = await TransportAllocation.findById(id)
      .populate('studentId')
      .populate('routeId');

    if (!allocation) {
      return res.status(404).json({ success: false, message: 'Allocation not found' });
    }

    res.status(200).json({ success: true, data: allocation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
