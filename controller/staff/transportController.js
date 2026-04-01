const Vehicle = require('../../model/Vehicle');
const Driver = require('../../model/Driver');
const Route = require('../../model/Route');
const RouteStop = require('../../model/RouteStop');
const RouteCharge = require('../../model/RouteCharge');
const TransportAllocation = require('../../model/TransportAllocation');
const Admin = require('../../model/Admin');

const getBranchClient = async (userId) => {
  const admin = await Admin.findById(userId).select('branch client').lean();
  return admin || null;
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
    const { branch } = await getBranchClient(req.userId);
    const drivers = await Driver.find({ branch })
      .select('-password').sort({ name: 1 }).lean();
    res.status(200).json({ drivers });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
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
    const routes = await Route.find({ branch, status: true }).sort({ routeName: 1 }).lean();
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
    const query = { branch, status: true };
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

// ─── TRANSPORT ALLOCATION ─────────────────────────────────

exports.getAllTransportAllocations = async (req, res) => {
  try {
    const { branch } = await getBranchClient(req.userId);
    const { routeId, vehicleId } = req.query;
    const query = { branch, status: true };
    if (routeId) query.route = routeId;
    if (vehicleId) query.vehicle = vehicleId;
    const allocations = await TransportAllocation.find(query)
      .populate('route', 'routeName')
      .populate('routeStop', 'stopName')
      .populate('vehicle', 'vehicleNo vehicleType')
      .sort({ createdAt: -1 }).lean();
    res.status(200).json({ allocations });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createTransportAllocation = async (req, res) => {
  try {
    const { branch, client } = await getBranchClient(req.userId);
    const allocation = await TransportAllocation.create({ ...req.body, branch, client, createdBy: req.userId });
    res.status(201).json({ message: 'Transport allocation created successfully', allocation });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateTransportAllocation = async (req, res) => {
  try {
    const { branch } = await getBranchClient(req.userId);
    const allocation = await TransportAllocation.findOneAndUpdate({ _id: req.params.id, branch }, req.body, { new: true }).lean();
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
