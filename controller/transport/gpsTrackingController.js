const Vehicle = require('../../model/Vehicle');
const Driver = require('../../model/Driver');
const Route = require('../../model/Route');
const RouteStop = require('../../model/RouteStop');
const TransportAssignment = require('../../model/TransportAssignment');
const TransportAllocation = require('../../model/TransportAllocation');
const VehicleLocation = require('../../model/VehicleLocation');
const Branch = require('../../model/Branch');

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Driver updates location — saved to MongoDB
exports.updateLocation = async (req, res) => {
  try {
    const { vehicleId, latitude, longitude, speed = 0, heading = 0 } = req.body;
    if (!vehicleId || !latitude || !longitude) {
      return res.status(400).json({ message: 'vehicleId, latitude and longitude are required' });
    }

    const vehicle = await Vehicle.findById(vehicleId).lean();
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    const driver = await Driver.findById(req.driverId).lean();
    if (!driver) return res.status(404).json({ message: 'Driver not found' });

    const loc = await VehicleLocation.findOneAndUpdate(
      { vehicle: vehicleId },
      {
        vehicle: vehicleId,
        driver: req.driverId,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        speed: parseFloat(speed),
        heading: parseFloat(heading),
        status: speed > 5 ? 'moving' : 'stopped',
        branch: driver.branch,
        client: driver.client,
        recordedAt: new Date()
      },
      { upsert: true, new: true }
    ).lean();

    return res.status(200).json({ success: true, message: 'Location updated', data: loc });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get latest location of a vehicle
exports.getVehicleLocation = async (req, res) => {
  try {
    const loc = await VehicleLocation.findOne({ vehicle: req.params.vehicleId })
      .populate('driver', 'name mobileNo')
      .lean();

    if (!loc) return res.status(404).json({ message: 'Location not available' });

    const staleMinutes = (new Date() - new Date(loc.recordedAt)) / 60000;
    return res.status(200).json({
      success: true,
      data: { ...loc, isOnline: staleMinutes < 5, staleMinutes: Math.round(staleMinutes) }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all active vehicles location for a branch
exports.getAllVehiclesLocation = async (req, res) => {
  try {
    const branchId = req.query.branch || req.user?.branch;
    const vehicles = await Vehicle.find({ branch: branchId, status: true })
      .select('_id vehicleNo vehicleType vehicleCapacity').lean();

    const vehicleIds = vehicles.map(v => v._id);
    const locations = await VehicleLocation.find({ vehicle: { $in: vehicleIds } })
      .populate('driver', 'name mobileNo').lean();

    const locMap = {};
    locations.forEach(l => { locMap[l.vehicle.toString()] = l; });

    const now = new Date();
    const result = vehicles.map(v => {
      const loc = locMap[v._id.toString()];
      const staleMinutes = loc ? (now - new Date(loc.recordedAt)) / 60000 : null;
      return {
        vehicleId: v._id,
        vehicleNo: v.vehicleNo,
        vehicleType: v.vehicleType,
        location: loc || null,
        isOnline: loc ? staleMinutes < 5 : false
      };
    });

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Track vehicle assigned to a student
exports.trackStudentVehicle = async (req, res) => {
  try {
    const allocation = await TransportAllocation.findOne({
      _id: req.params.studentId,
      status: true
    }).populate('route', 'routeName').populate('vehicle', 'vehicleNo vehicleType').lean();

    if (!allocation) return res.status(404).json({ message: 'No transport allocated for this student' });

    const assignment = await TransportAssignment.findOne({
      vehicle: allocation.vehicle._id, status: true
    }).populate('driver', 'name mobileNo').lean();

    const loc = await VehicleLocation.findOne({ vehicle: allocation.vehicle._id }).lean();
    const isOnline = loc && (new Date() - new Date(loc.recordedAt)) / 60000 < 5;

    return res.status(200).json({
      success: true,
      data: {
        vehicle: { id: allocation.vehicle._id, vehicleNo: allocation.vehicle.vehicleNo, type: allocation.vehicle.vehicleType },
        driver: assignment?.driver ? { name: assignment.driver.name, mobile: assignment.driver.mobileNo } : null,
        route: { name: allocation.route?.routeName },
        location: isOnline ? loc : null,
        status: isOnline ? 'online' : 'offline'
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Trip history from VehicleLocation records grouped by date
exports.getTripHistory = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { startDate, endDate } = req.query;

    const match = { vehicle: new (require('mongoose').Types.ObjectId)(vehicleId) };
    if (startDate || endDate) {
      match.recordedAt = {};
      if (startDate) match.recordedAt.$gte = new Date(startDate);
      if (endDate) match.recordedAt.$lte = new Date(endDate + 'T23:59:59');
    }

    const history = await VehicleLocation.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$recordedAt' } },
          maxSpeed: { $max: '$speed' },
          avgSpeed: { $avg: '$speed' },
          firstSeen: { $min: '$recordedAt' },
          lastSeen: { $max: '$recordedAt' },
          totalPoints: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: 30 }
    ]);

    return res.status(200).json({ success: true, data: history });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Geofence check — uses branch location dynamically
exports.checkGeofence = async (req, res) => {
  try {
    const { vehicleId, latitude, longitude, radiusKm = 2 } = req.body;
    if (!vehicleId || !latitude || !longitude) {
      return res.status(400).json({ message: 'vehicleId, latitude and longitude are required' });
    }

    const vehicle = await Vehicle.findById(vehicleId).populate('branch', 'latitude longitude branchName').lean();
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    const branch = vehicle.branch;
    if (!branch?.latitude || !branch?.longitude) {
      return res.status(400).json({ message: 'Branch coordinates not set. Update branch with latitude and longitude.' });
    }

    const distance = calculateDistance(parseFloat(latitude), parseFloat(longitude), branch.latitude, branch.longitude);
    const isWithin = distance <= radiusKm;

    return res.status(200).json({
      success: true,
      data: {
        vehicleId,
        branchName: branch.branchName,
        isWithinGeofence: isWithin,
        distanceKm: parseFloat(distance.toFixed(2)),
        radiusKm,
        timestamp: new Date()
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Route stops with allocation count
exports.optimizeRoute = async (req, res) => {
  try {
    const route = await Route.findById(req.params.routeId).lean();
    if (!route) return res.status(404).json({ message: 'Route not found' });

    const [stops, allocations] = await Promise.all([
      RouteStop.find({ route: req.params.routeId }).sort({ stopOrder: 1 }).lean(),
      TransportAllocation.find({ route: req.params.routeId, status: true }).lean()
    ]);

    const stopMap = {};
    allocations.forEach(a => {
      const key = a.routeStop?.toString();
      if (key) stopMap[key] = (stopMap[key] || 0) + 1;
    });

    const result = stops.map(s => ({
      stopId: s._id,
      stopName: s.stopName,
      stopOrder: s.stopOrder,
      pickupTime: s.pickupTime,
      dropTime: s.dropTime,
      studentsCount: stopMap[s._id.toString()] || 0
    }));

    return res.status(200).json({
      success: true,
      data: {
        routeName: route.routeName,
        totalStops: stops.length,
        totalStudents: allocations.length,
        estimatedDuration: `${stops.length * 3} minutes`,
        stops: result
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Driver GPS Dashboard — uses req.driverId from driverAuth middleware
exports.getDriverDashboard = async (req, res) => {
  try {
    const driverId = req.driverId;

    const [driver, assignment] = await Promise.all([
      Driver.findById(driverId).select('name mobileNo licenseNo licenseExpiryDate branch').lean(),
      TransportAssignment.findOne({ driver: driverId, status: true })
        .populate('vehicle', 'vehicleNo vehicleType vehicleCapacity')
        .populate('route', 'routeName routeCode startPoint endPoint')
        .lean()
    ]);

    if (!driver) return res.status(404).json({ message: 'Driver not found' });

    const [allocations, loc] = await Promise.all([
      assignment ? TransportAllocation.find({ route: assignment.route?._id, status: true })
        .populate('routeStop', 'stopName pickupTime dropTime').lean() : Promise.resolve([]),
      assignment ? VehicleLocation.findOne({ vehicle: assignment.vehicle?._id }).lean() : Promise.resolve(null)
    ]);

    const isOnline = loc && (new Date() - new Date(loc.recordedAt)) / 60000 < 5;

    return res.status(200).json({
      success: true,
      data: {
        driver: { name: driver.name, mobile: driver.mobileNo, licenseNo: driver.licenseNo, licenseExpiryDate: driver.licenseExpiryDate },
        vehicle: assignment?.vehicle ? { vehicleNo: assignment.vehicle.vehicleNo, type: assignment.vehicle.vehicleType, capacity: assignment.vehicle.vehicleCapacity } : null,
        route: assignment?.route ? { routeName: assignment.route.routeName, routeCode: assignment.route.routeCode, startPoint: assignment.route.startPoint, endPoint: assignment.route.endPoint } : null,
        location: isOnline ? { latitude: loc.latitude, longitude: loc.longitude, speed: loc.speed, status: loc.status, updatedAt: loc.recordedAt } : null,
        isOnline,
        stats: {
          totalStudents: allocations.length,
          totalStops: [...new Set(allocations.map(a => a.routeStop?._id?.toString()).filter(Boolean))].length
        }
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};
