const Vehicle = require('../../model/Vehicle');
const Driver = require('../../model/Driver');
const Route = require('../../model/Route');
const TransportAllocation = require('../../model/TransportAllocation');
const { successResponse, errorResponse } = require('../../responseFormatter');

// Model for GPS location (in-memory or Redis for real-time)
// In production, use Redis or MongoDB with TTL
const vehicleLocations = new Map();

// ─── UPDATE VEHICLE LOCATION (Driver App) ────────────────────────────────────

exports.updateLocation = async (req, res) => {
  try {
    const { vehicleId, latitude, longitude, speed, heading } = req.body;
    
    if (!vehicleId || !latitude || !longitude) {
      return errorResponse(res, 'vehicleId, latitude and longitude are required', 400);
    }

    const vehicle = await Vehicle.findById(vehicleId).lean();
    if (!vehicle) return errorResponse(res, 'Vehicle not found', 404);

    const locationData = {
      vehicleId,
      vehicleNumber: vehicle.vehicleNumber,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      speed: speed || 0,
      heading: heading || 0,
      timestamp: new Date(),
      status: speed > 5 ? 'moving' : 'stopped'
    };

    // Store in memory (use Redis in production)
    vehicleLocations.set(vehicleId, locationData);

    // Optionally save to database for history
    // await VehicleLocation.create(locationData);

    return successResponse(res, locationData, 'Location updated');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

// ─── GET VEHICLE LOCATION (Parent/Admin) ─────────────────────────────────────

exports.getVehicleLocation = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    
    const location = vehicleLocations.get(vehicleId);
    if (!location) {
      return errorResponse(res, 'Location not available', 404);
    }

    // Check if location is stale (older than 5 minutes)
    const now = new Date();
    const diff = (now - new Date(location.timestamp)) / 1000 / 60;
    if (diff > 5) {
      return errorResponse(res, 'Location data is stale', 404);
    }

    return successResponse(res, location, 'Location fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

// ─── GET ALL ACTIVE VEHICLES LOCATION ────────────────────────────────────────

exports.getAllVehiclesLocation = async (req, res) => {
  try {
    const { branch } = req.query;
    
    const vehicles = await Vehicle.find({ 
      branch, 
      status: 'active' 
    }).select('_id vehicleNumber vehicleType').lean();

    const locations = vehicles.map(v => {
      const loc = vehicleLocations.get(v._id.toString());
      return {
        vehicleId: v._id,
        vehicleNumber: v.vehicleNumber,
        vehicleType: v.vehicleType,
        location: loc || null,
        isOnline: loc && ((new Date() - new Date(loc.timestamp)) / 1000 / 60) < 5
      };
    });

    return successResponse(res, locations, 'All vehicles location fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

// ─── TRACK STUDENT VEHICLE ───────────────────────────────────────────────────

exports.trackStudentVehicle = async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const allocation = await TransportAllocation.findOne({ 
      studentId: studentId.toString(), 
      status: 'active' 
    }).lean();

    if (!allocation) {
      return errorResponse(res, 'No transport allocated for this student', 404);
    }

    const [vehicle, driver, route, location] = await Promise.all([
      Vehicle.findById(allocation.vehicleId).lean(),
      Driver.findById(allocation.driverId).lean(),
      Route.findById(allocation.routeId).lean(),
      Promise.resolve(vehicleLocations.get(allocation.vehicleId?.toString()))
    ]);

    const isOnline = location && ((new Date() - new Date(location.timestamp)) / 1000 / 60) < 5;

    return successResponse(res, {
      vehicle: {
        id: vehicle?._id,
        number: vehicle?.vehicleNumber,
        type: vehicle?.vehicleType
      },
      driver: {
        name: driver?.name,
        mobile: driver?.mobile
      },
      route: {
        name: route?.routeName,
        pickupPoint: allocation.pickupPoint,
        pickupTime: allocation.pickupTime
      },
      location: isOnline ? location : null,
      status: isOnline ? 'online' : 'offline'
    }, 'Vehicle tracking data');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

// ─── ROUTE OPTIMIZATION ───────────────────────────────────────────────────────

exports.optimizeRoute = async (req, res) => {
  try {
    const { routeId } = req.params;
    
    const route = await Route.findById(routeId).lean();
    if (!route) return errorResponse(res, 'Route not found', 404);

    // Get all students on this route
    const allocations = await TransportAllocation.find({ 
      routeId, 
      status: 'active' 
    })
      .populate('studentId', 'firstName lastName currentAddress')
      .lean();

    // Simple optimization: sort by pickup time
    const stops = allocations.map(a => ({
      studentId: a.studentId?._id,
      studentName: `${a.studentId?.firstName} ${a.studentId?.lastName}`,
      address: a.studentId?.currentAddress,
      pickupPoint: a.pickupPoint,
      pickupTime: a.pickupTime,
      latitude: a.latitude || 0,
      longitude: a.longitude || 0
    }));

    // Sort by time
    stops.sort((a, b) => {
      const timeA = a.pickupTime?.split(':').map(Number) || [0, 0];
      const timeB = b.pickupTime?.split(':').map(Number) || [0, 0];
      return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
    });

    // Calculate estimated time
    const totalStops = stops.length;
    const avgTimePerStop = 3; // 3 minutes per stop
    const estimatedDuration = totalStops * avgTimePerStop;

    return successResponse(res, {
      routeName: route.routeName,
      totalStops,
      estimatedDuration: `${estimatedDuration} minutes`,
      optimizedStops: stops,
      suggestions: [
        totalStops > 20 ? 'Consider splitting this route into two' : null,
        'Ensure pickup times have 5-minute buffer',
        'Update GPS coordinates for accurate tracking'
      ].filter(Boolean)
    }, 'Route optimized');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

// ─── VEHICLE TRIP HISTORY ─────────────────────────────────────────────────────

exports.getTripHistory = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { startDate, endDate } = req.query;

    // In production, fetch from VehicleLocation collection
    // For now, return mock data structure
    const trips = [
      {
        date: new Date().toISOString().split('T')[0],
        startTime: '07:00 AM',
        endTime: '09:30 AM',
        totalDistance: '45 km',
        totalStops: 15,
        status: 'completed'
      }
    ];

    return successResponse(res, trips, 'Trip history fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

// ─── GEOFENCE ALERTS ──────────────────────────────────────────────────────────

exports.checkGeofence = async (req, res) => {
  try {
    const { vehicleId, latitude, longitude } = req.body;
    
    // Define school geofence (example: 2km radius)
    const schoolLat = 28.7041; // Replace with actual school coordinates
    const schoolLng = 77.1025;
    const maxDistance = 2; // km

    const distance = calculateDistance(latitude, longitude, schoolLat, schoolLng);
    
    const alert = {
      vehicleId,
      isWithinGeofence: distance <= maxDistance,
      distance: distance.toFixed(2),
      timestamp: new Date()
    };

    if (!alert.isWithinGeofence) {
      // Send notification to admin
      // await sendNotification({ type: 'geofence_breach', vehicleId, distance });
    }

    return successResponse(res, alert, 'Geofence checked');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

// ─── HELPER: Calculate Distance ───────────────────────────────────────────────

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

// ─── DRIVER DASHBOARD ─────────────────────────────────────────────────────────

exports.getDriverDashboard = async (req, res) => {
  try {
    const driverId = req.userId; // From auth middleware
    
    const driver = await Driver.findById(driverId).lean();
    if (!driver) return errorResponse(res, 'Driver not found', 404);

    const today = new Date().toISOString().split('T')[0];

    const [vehicle, todayAllocations, route] = await Promise.all([
      Vehicle.findOne({ assignedDriver: driverId, status: 'active' }).lean(),
      TransportAllocation.find({ 
        driverId, 
        status: 'active' 
      }).populate('studentId', 'firstName lastName mobile').lean(),
      Route.findOne({ assignedDriver: driverId }).lean()
    ]);

    const location = vehicle ? vehicleLocations.get(vehicle._id.toString()) : null;

    return successResponse(res, {
      driver: {
        name: driver.name,
        mobile: driver.mobile,
        licenseNumber: driver.licenseNumber
      },
      vehicle: vehicle ? {
        number: vehicle.vehicleNumber,
        type: vehicle.vehicleType,
        currentLocation: location
      } : null,
      route: route ? {
        name: route.routeName,
        totalStops: todayAllocations.length
      } : null,
      todayStudents: todayAllocations.map(a => ({
        name: `${a.studentId?.firstName} ${a.studentId?.lastName}`,
        pickupPoint: a.pickupPoint,
        pickupTime: a.pickupTime,
        mobile: a.studentId?.mobile
      })),
      stats: {
        totalStudents: todayAllocations.length,
        completedTrips: 0, // Calculate from trip history
        pendingTrips: 2 // Morning & Evening
      }
    }, 'Driver dashboard data');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

module.exports = exports;
