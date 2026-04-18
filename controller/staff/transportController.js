const Vehicle = require('../../model/Vehicle');
const Driver = require('../../model/Driver');
const Route = require('../../model/Route');
const RouteStop = require('../../model/RouteStop');
const RouteCharge = require('../../model/RouteCharge');
const TransportAllocation = require('../../model/TransportAllocation');
const TransportAssignment = require('../../model/TransportAssignment');
const Admin = require('../../model/Admin');
const Staff = require('../../model/Staff');
const { successResponse, errorResponse } = require('../../responseFormatter');

const getBranchClient = async (userId) => {
  let user = await Admin.findById(userId).select('branch client').lean();
  if (!user) {
    user = await Staff.findById(userId).select('branch client').lean();
  }
  if (!user) {
    throw new Error('User not found or unauthorized');
  }
  return user;
};

// ─── VEHICLE ──────────────────────────────────────────────

exports.getAllVehicles = async (req, res) => {
  try {
    const { branch } = await getBranchClient(req.userId);
    const vehicles = await Vehicle.find({ branch })
      .sort({ vehicleNo: 1 }).lean();
    res.status(200).json({ vehicles });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createVehicle = async (req, res) => {
  try {
    const { branch, client } = await getBranchClient(req.userId);
    const vehicle = await Vehicle.create({ ...req.body, branch, client, createdBy: req.userId });
    res.status(201).json({ message: 'Vehicle created successfully', vehicle });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateVehicle = async (req, res) => {
  try {
    const { branch } = await getBranchClient(req.userId);
    const vehicle = await Vehicle.findOneAndUpdate({ _id: req.params.id, branch }, req.body, { new: true }).lean();
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    res.status(200).json({ message: 'Vehicle updated successfully', vehicle });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteVehicle = async (req, res) => {
  try {
    const { branch } = await getBranchClient(req.userId);
    await Vehicle.findOneAndUpdate({ _id: req.params.id, branch }, { status: false });
    res.status(200).json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── DRIVER ───────────────────────────────────────────────

exports.getAllDrivers = async (req, res) => {
  try {
    const user = await getBranchClient(req.userId);
    const query = {};
    
    if (user.branch) {
      query.branch = user.branch;
    } else if (user.client) {
      query.client = user.client;
    }

    const drivers = await Driver.find(query)
      .select('-password')
      .sort({ name: 1 })
      .lean();
      
    return successResponse(res, { drivers }, 'Drivers fetched successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.createDriver = async (req, res) => {
  try {
    const { branch, client } = await getBranchClient(req.userId);
    const driver = await Driver.create({ ...req.body, branch, client, createdBy: req.userId });
    res.status(201).json({ message: 'Driver created successfully', driver });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateDriver = async (req, res) => {
  try {
    const { branch } = await getBranchClient(req.userId);
    const driver = await Driver.findOneAndUpdate({ _id: req.params.id, branch }, req.body, { new: true }).select('-password').lean();
    if (!driver) return res.status(404).json({ message: 'Driver not found' });
    res.status(200).json({ message: 'Driver updated successfully', driver });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteDriver = async (req, res) => {
  try {
    const { branch } = await getBranchClient(req.userId);
    await Driver.findOneAndUpdate({ _id: req.params.id, branch }, { status: false });
    res.status(200).json({ message: 'Driver deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── ROUTE ────────────────────────────────────────────────

exports.getAllRoutes = async (req, res) => {
  try {
    const { branch } = await getBranchClient(req.userId);
    const routes = await Route.find({ branch }).sort({ routeName: 1 }).lean();
    res.status(200).json({ routes });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createRoute = async (req, res) => {
  try {
    const { branch, client } = await getBranchClient(req.userId);
    const route = await Route.create({ ...req.body, branch, client, createdBy: req.userId });
    res.status(201).json({ message: 'Route created successfully', route });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateRoute = async (req, res) => {
  try {
    const { branch } = await getBranchClient(req.userId);
    const route = await Route.findOneAndUpdate({ _id: req.params.id, branch }, req.body, { new: true }).lean();
    if (!route) return res.status(404).json({ message: 'Route not found' });
    res.status(200).json({ message: 'Route updated successfully', route });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteRoute = async (req, res) => {
  try {
    const { branch } = await getBranchClient(req.userId);
    await Route.findOneAndUpdate({ _id: req.params.id, branch }, { status: false });
    res.status(200).json({ message: 'Route deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── ROUTE STOP ───────────────────────────────────────────

exports.getAllRouteStops = async (req, res) => {
  try {
    const { branch } = await getBranchClient(req.userId);
    const { routeId } = req.query;
    const query = { branch };
    if (routeId) query.route = routeId;
    const stops = await RouteStop.find(query)
      .populate('route', 'routeName')
      .sort({ stopOrder: 1 }).lean();
    res.status(200).json({ stops });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createRouteStop = async (req, res) => {
  try {
    const { branch, client } = await getBranchClient(req.userId);
    const stop = await RouteStop.create({ ...req.body, branch, client, createdBy: req.userId });
    res.status(201).json({ message: 'Route stop created successfully', stop });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateRouteStop = async (req, res) => {
  try {
    const { branch } = await getBranchClient(req.userId);
    const stop = await RouteStop.findOneAndUpdate({ _id: req.params.id, branch }, req.body, { new: true }).lean();
    if (!stop) return res.status(404).json({ message: 'Route stop not found' });
    res.status(200).json({ message: 'Route stop updated successfully', stop });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteRouteStop = async (req, res) => {
  try {
    const { branch } = await getBranchClient(req.userId);
    await RouteStop.findOneAndDelete({ _id: req.params.id, branch });
    res.status(200).json({ message: 'Route stop deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── ROUTE CHARGE ─────────────────────────────────────────

exports.getAllRouteCharges = async (req, res) => {
  try {
    const { branch } = await getBranchClient(req.userId);
    const { routeId } = req.query;
    const query = { branch };
    if (routeId) query.route = routeId;
    const charges = await RouteCharge.find(query)
      .populate('route', 'routeName')
      .populate('routeStop', 'stopName')
      .sort({ createdAt: -1 }).lean();
    res.status(200).json({ charges });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createRouteCharge = async (req, res) => {
  try {
    const { branch, client } = await getBranchClient(req.userId);
    const charge = await RouteCharge.create({ ...req.body, branch, client, createdBy: req.userId });
    res.status(201).json({ message: 'Route charge created successfully', charge });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateRouteCharge = async (req, res) => {
  try {
    const { branch } = await getBranchClient(req.userId);
    const charge = await RouteCharge.findOneAndUpdate({ _id: req.params.id, branch }, req.body, { new: true }).lean();
    if (!charge) return res.status(404).json({ message: 'Route charge not found' });
    res.status(200).json({ message: 'Route charge updated successfully', charge });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteRouteCharge = async (req, res) => {
  try {
    const { branch } = await getBranchClient(req.userId);
    await RouteCharge.findOneAndUpdate({ _id: req.params.id, branch }, { status: false });
    res.status(200).json({ message: 'Route charge deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getAllTransportAllocations = async (req, res) => {
  try {
    const adminData = await getBranchClient(req.userId);
    const branch = adminData?.branch;
    const client = adminData?.client;
    const { routeId, vehicleId } = req.query;
    
    // Build query - if no branch/client, fetch all
    const query = branch ? { branch } : client ? { client } : {};
    if (routeId) query.route = routeId;
    if (vehicleId) query.vehicle = vehicleId;
    
    const allocations = await TransportAllocation.find(query)
      .populate('route', 'routeName')
      .populate('routeStop', 'stopName')
      .populate('vehicle', 'vehicleNo vehicleType')
      .sort({ createdAt: -1 })
      .lean();
    
    // Map database fields to frontend expected fields
    const mappedAllocations = allocations.map(a => ({
      _id: a._id,
      studentStaffName: a.userName,
      userType: a.userType,
      route: a.route?.routeName || a.route,
      stop: a.routeStop?.stopName || a.routeStop,
      vehicle: a.vehicle?.vehicleNo || a.vehicle,
      monthlyCharge: a.monthlyCharges,
      pickupDrop: a.service,
      joiningDate: a.joiningDate,
      status: a.status ? 'Active' : 'Inactive'
    }));
    
    res.status(200).json({ allocations: mappedAllocations });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createTransportAllocation = async (req, res) => {
  try {
    const adminData = await getBranchClient(req.userId);
    const branch = adminData?.branch;
    const client = adminData?.client;
    const { studentStaffName, userType, route, stop, vehicle, monthlyCharge, pickupDrop, joiningDate, status } = req.body;
    
    const allocation = await TransportAllocation.create({
      userName: studentStaffName,
      userType: userType.toLowerCase(),
      route,
      routeStop: stop,
      vehicle,
      monthlyCharges: monthlyCharge,
      service: pickupDrop.toLowerCase().replace(/\s+/g, ''),
      joiningDate,
      status: status === 'Active' ? true : false,
      branch,
      client,
      createdBy: req.userId
    });
    res.status(201).json({ message: 'Transport allocation created successfully', allocation });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateTransportAllocation = async (req, res) => {
  try {
    const adminData = await getBranchClient(req.userId);
    const branch = adminData?.branch;
    const client = adminData?.client;
    const { studentStaffName, userType, route, stop, vehicle, monthlyCharge, pickupDrop, joiningDate, status } = req.body;
    
    const updateData = {
      userName: studentStaffName,
      userType: userType.toLowerCase(),
      route,
      routeStop: stop,
      vehicle,
      monthlyCharges: monthlyCharge,
      service: pickupDrop.toLowerCase().replace(/\s+/g, ''),
      joiningDate,
      status: status === 'Active' ? true : false
    };
    
    const query = branch ? { _id: req.params.id, branch } : client ? { _id: req.params.id, client } : { _id: req.params.id };
    const allocation = await TransportAllocation.findOneAndUpdate(query, updateData, { new: true }).lean();
    
    if (!allocation) return res.status(404).json({ message: 'Allocation not found' });
    res.status(200).json({ message: 'Allocation updated successfully', allocation });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteTransportAllocation = async (req, res) => {
  try {
    const { branch } = await getBranchClient(req.userId);
    await TransportAllocation.findOneAndUpdate({ _id: req.params.id, branch }, { status: false });
    res.status(200).json({ message: 'Allocation deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── TRANSPORT ASSIGNMENT ───────────────────────────────────

exports.getAllAssignments = async (req, res) => {
  try {
    const { branch } = await getBranchClient(req.userId);
    const assignments = await TransportAssignment.find({ branch })
      .populate('vehicle', 'vehicleNo vehicleType')
      .populate('driver', 'name mobileNo')
      .populate('route', 'routeName routeCode')
      .sort({ createdAt: -1 }).lean();
    res.status(200).json({ assignments });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createAssignment = async (req, res) => {
  try {
    const { branch, client } = await getBranchClient(req.userId);
    const assignment = await TransportAssignment.create({ ...req.body, branch, client, createdBy: req.userId });
    res.status(201).json({ message: 'Assignment created successfully', assignment });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateAssignment = async (req, res) => {
  try {
    const { branch } = await getBranchClient(req.userId);
    const assignment = await TransportAssignment.findOneAndUpdate({ _id: req.params.id, branch }, req.body, { new: true }).lean();
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
    res.status(200).json({ message: 'Assignment updated successfully', assignment });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteAssignment = async (req, res) => {
  try {
    const { branch } = await getBranchClient(req.userId);
    await TransportAssignment.findOneAndUpdate({ _id: req.params.id, branch }, { status: false });
    res.status(200).json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── DASHBOARD STATS ─────────────────────────────────────────

exports.getTransportDashboardStats = async (req, res) => {
  try {
    const adminData = await getBranchClient(req.userId);
    const branch = adminData?.branch;
    const client = adminData?.client;
    
    // Build query - if no branch/client, fetch all
    const matchQ = branch ? { branch } : client ? { client } : {};
    
    const [
      totalVehicles,
      activeVehicles,
      totalDrivers,
      activeDrivers,
      totalRoutes,
      totalRouteStops,
      totalAllocations,
      activeAllocations
    ] = await Promise.all([
      Vehicle.countDocuments(matchQ),
      Vehicle.countDocuments({ ...matchQ, status: true }),
      Driver.countDocuments(matchQ),
      Driver.countDocuments({ ...matchQ, status: true }),
      Route.countDocuments(matchQ),
      RouteStop.countDocuments(matchQ),
      TransportAllocation.countDocuments(matchQ),
      TransportAllocation.countDocuments({ ...matchQ, status: true })
    ]);

    res.status(200).json({
      stats: {
        totalVehicles,
        activeVehicles,
        totalDrivers,
        activeDrivers,
        totalRoutes,
        totalRouteStops,
        totalAllocations,
        activeAllocations
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
