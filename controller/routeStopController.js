const RouteStop = require('../model/RouteStop');
const Route = require('../model/Route');
const Admin = require('../model/Admin');

// Add Route Stops (Single or Multiple)
exports.addRouteStops = async (req, res) => {
  try {
    const { routeId, stops } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId).populate('branch').populate('client');
    if (!admin || (admin.role !== 'branchAdmin' && admin.role !== 'staffAdmin')) {
      return res.status(403).json({ message: 'Only branch admin or staff can add route stops' });
    }

    const route = await Route.findById(routeId);
    if (!route) {
      return res.status(404).json({ message: 'Route not found' });
    }

    const adminBranchId = admin.branch?._id?.toString() || admin.branch?.toString();
    const routeBranchId = route.branch?.toString();

    if (routeBranchId !== adminBranchId) {
      return res.status(403).json({ message: 'Route does not belong to your branch' });
    }

    const routeStops = stops.map(stop => ({
      route: routeId,
      stopName: stop.stopName,
      stopOrder: stop.stopOrder || stop.sequence,
      pickupTime: stop.pickupTime || stop.arrivalTime,
      dropTime: stop.dropTime || stop.departureTime,
      branch: admin.branch?._id || admin.branch,
      client: admin.client?._id || admin.client,
      createdBy: adminId
    }));

    const savedStops = await RouteStop.insertMany(routeStops);
    res.status(201).json({ message: 'Route stops added successfully', data: savedStops });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Route Stops
exports.getAllRouteStops = async (req, res) => {
  try {
    const currentUserId = req.userId;
    const currentUserRole = req.user.role;
    
    let branchId = req.user.branch;
    let clientId = req.user.client;

    let routeStops;
    const adminBranchId = branchId?.toString();
    const adminClientId = clientId?.toString();
    
    if (currentUserRole === 'branchAdmin' || currentUserRole === 'staffAdmin' || currentUserRole === 'driver') {
      routeStops = await RouteStop.find({ branch: adminBranchId })
        .populate('route', 'routeName routeCode')
        .populate('branch', 'branchName branchCode')
        .populate('createdBy', 'email role')
        .sort({ route: 1, stopOrder: 1 });
    } else if (currentUserRole === 'clientAdmin') {
      routeStops = await RouteStop.find({ client: adminClientId })
        .populate('route', 'routeName routeCode')
        .populate('branch', 'branchName branchCode')
        .populate('createdBy', 'email role')
        .sort({ route: 1, stopOrder: 1 });
    } else {
      routeStops = await RouteStop.find()
        .populate('route', 'routeName routeCode')
        .populate('branch', 'branchName branchCode')
        .populate('client', 'name')
        .populate('createdBy', 'email role')
        .sort({ route: 1, stopOrder: 1 });
    }

    res.status(200).json({ data: routeStops });
  } catch (error) {
    console.error('Get all route stops error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Route Stop By ID
exports.getRouteStopById = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId).populate('branch').populate('client');
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const routeStop = await RouteStop.findById(id)
      .populate('route', 'routeName routeCode startPoint endPoint')
      .populate('branch', 'branchName branchCode')
      .populate('client', 'name')
      .populate('createdBy', 'email role');

    if (!routeStop) {
      return res.status(404).json({ message: 'Route stop not found' });
    }

    const adminBranchId = admin.branch?._id?.toString() || admin.branch?.toString();
    const stopBranchId = routeStop.branch?._id?.toString() || routeStop.branch?.toString();

    if (admin.role === 'branchAdmin' && stopBranchId !== adminBranchId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const adminClientId = admin.client?._id?.toString() || admin.client?.toString();
    const stopClientId = routeStop.client?._id?.toString() || routeStop.client?.toString();

    if (admin.role === 'clientAdmin' && stopClientId !== adminClientId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.status(200).json({ data: routeStop });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Route Stops By Route ID
exports.getRouteStopsByRoute = async (req, res) => {
  try {
    const { routeId } = req.params;
    const currentUserRole = req.user.role;
    let branchId = req.user.branch;

    const route = await Route.findById(routeId);
    if (!route) {
      return res.status(404).json({ message: 'Route not found' });
    }

    if (currentUserRole === 'branchAdmin' && route.branch.toString() !== branchId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const routeStops = await RouteStop.find({ route: routeId })
      .populate('route', 'routeName routeCode')
      .sort({ stopOrder: 1 });

    res.status(200).json({ data: routeStops });
  } catch (error) {
    console.error('Get route stops by route error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Route Stop
exports.updateRouteStop = async (req, res) => {
  try {
    const { id } = req.params;
    const { stopName, stopOrder, sequence, pickupTime, arrivalTime, dropTime, departureTime, status } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId).populate('branch').populate('client');
    if (!admin || (admin.role !== 'branchAdmin' && admin.role !== 'staffAdmin')) {
      return res.status(403).json({ message: 'Only branch admin or staff can update route stops' });
    }

    const routeStop = await RouteStop.findById(id);
    if (!routeStop) {
      return res.status(404).json({ message: 'Route stop not found' });
    }

    const adminBranchId = admin.branch?._id?.toString() || admin.branch?.toString();
    const stopBranchId = routeStop.branch?.toString();

    if (stopBranchId !== adminBranchId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (stopName) routeStop.stopName = stopName;
    if (stopOrder) routeStop.stopOrder = stopOrder;
    if (sequence) routeStop.stopOrder = sequence;
    if (pickupTime !== undefined) routeStop.pickupTime = pickupTime;
    if (arrivalTime !== undefined) routeStop.pickupTime = arrivalTime;
    if (dropTime !== undefined) routeStop.dropTime = dropTime;
    if (departureTime !== undefined) routeStop.dropTime = departureTime;
    if (status !== undefined) routeStop.status = status;

    await routeStop.save();
    res.status(200).json({ message: 'Route stop updated successfully', data: routeStop });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete Route Stop
exports.deleteRouteStop = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId).populate('branch').populate('client');
    if (!admin || (admin.role !== 'branchAdmin' && admin.role !== 'staffAdmin')) {
      return res.status(403).json({ message: 'Only branch admin or staff can delete route stops' });
    }

    const routeStop = await RouteStop.findById(id);
    if (!routeStop) {
      return res.status(404).json({ message: 'Route stop not found' });
    }

    const adminBranchId = admin.branch?._id?.toString() || admin.branch?.toString();
    const stopBranchId = routeStop.branch?.toString();

    if (stopBranchId !== adminBranchId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await RouteStop.findByIdAndDelete(id);
    res.status(200).json({ message: 'Route stop deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
