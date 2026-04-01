const RouteStop = require('../model/RouteStop');
const Route = require('../model/Route');
const Admin = require('../model/Admin');

// Add Route Stops (Single or Multiple)
exports.addRouteStops = async (req, res) => {
  try {
    const { routeId, stops } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || (admin.role !== 'branchAdmin' && admin.role !== 'staffAdmin')) {
      return res.status(403).json({ message: 'Only branch admin or staff can add route stops' });
    }

    const route = await Route.findById(routeId);
    if (!route) {
      return res.status(404).json({ message: 'Route not found' });
    }

    if (route.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Route does not belong to your branch' });
    }

    const routeStops = stops.map(stop => ({
      route: routeId,
      stopName: stop.stopName,
      stopOrder: stop.stopOrder,
      pickupTime: stop.pickupTime,
      dropTime: stop.dropTime,
      branch: admin.branch,
      client: admin.client,
      createdBy: adminId
    }));

    const savedStops = await RouteStop.insertMany(routeStops);
    res.status(201).json({ message: 'Route stops added successfully', stops: savedStops });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Route Stops
exports.getAllRouteStops = async (req, res) => {
  try {
    const adminId = req.userId;
    const admin = await Admin.findById(adminId);

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    let routeStops;
    if (admin.role === 'branchAdmin' || admin.role === 'staffAdmin') {
      routeStops = await RouteStop.find({ branch: admin.branch })
        .populate('route', 'routeName routeCode')
        .populate('branch', 'branchName branchCode')
        .populate('createdBy', 'email role')
        .sort({ route: 1, stopOrder: 1 });
    } else if (admin.role === 'clientAdmin') {
      routeStops = await RouteStop.find({ client: admin.client })
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

    res.status(200).json({ routeStops });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Route Stop By ID
exports.getRouteStopById = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
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

    if (admin.role === 'branchAdmin' && routeStop.branch._id.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (admin.role === 'clientAdmin' && routeStop.client._id.toString() !== admin.client.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.status(200).json({ routeStop });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Route Stop
exports.updateRouteStop = async (req, res) => {
  try {
    const { id } = req.params;
    const { stopName, stopOrder, pickupTime, dropTime } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || (admin.role !== 'branchAdmin' && admin.role !== 'staffAdmin')) {
      return res.status(403).json({ message: 'Only branch admin or staff can update route stops' });
    }

    const routeStop = await RouteStop.findById(id);
    if (!routeStop) {
      return res.status(404).json({ message: 'Route stop not found' });
    }

    if (routeStop.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (stopName) routeStop.stopName = stopName;
    if (stopOrder) routeStop.stopOrder = stopOrder;
    if (pickupTime) routeStop.pickupTime = pickupTime;
    if (dropTime) routeStop.dropTime = dropTime;

    await routeStop.save();
    res.status(200).json({ message: 'Route stop updated successfully', routeStop });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete Route Stop
exports.deleteRouteStop = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || (admin.role !== 'branchAdmin' && admin.role !== 'staffAdmin')) {
      return res.status(403).json({ message: 'Only branch admin or staff can delete route stops' });
    }

    const routeStop = await RouteStop.findById(id);
    if (!routeStop) {
      return res.status(404).json({ message: 'Route stop not found' });
    }

    if (routeStop.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await RouteStop.findByIdAndDelete(id);
    res.status(200).json({ message: 'Route stop deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
