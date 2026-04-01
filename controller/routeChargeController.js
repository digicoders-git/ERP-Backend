const RouteCharge = require('../model/RouteCharge');
const Route = require('../model/Route');
const RouteStop = require('../model/RouteStop');
const Admin = require('../model/Admin');

// Add Route Charge
exports.addRouteCharge = async (req, res) => {
  try {
    const { routeId, routeStopId, monthlyCharge, tripType, effectiveFrom } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || (admin.role !== 'branchAdmin' && admin.role !== 'staffAdmin')) {
      return res.status(403).json({ message: 'Only branch admin or staff can add route charges' });
    }

    const route = await Route.findById(routeId);
    if (!route) {
      return res.status(404).json({ message: 'Route not found' });
    }

    if (route.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Route does not belong to your branch' });
    }

    if (routeStopId) {
      const routeStop = await RouteStop.findById(routeStopId);
      if (!routeStop) {
        return res.status(404).json({ message: 'Route stop not found' });
      }
      if (routeStop.route.toString() !== routeId) {
        return res.status(400).json({ message: 'Route stop does not belong to the selected route' });
      }
    }

    const newRouteCharge = new RouteCharge({
      route: routeId,
      routeStop: routeStopId || undefined,
      monthlyCharge,
      tripType,
      effectiveFrom,
      branch: admin.branch,
      client: admin.client,
      createdBy: adminId
    });

    await newRouteCharge.save();
    res.status(201).json({ message: 'Route charge added successfully', routeCharge: newRouteCharge });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Route Charges
exports.getAllRouteCharges = async (req, res) => {
  try {
    const adminId = req.userId;
    const admin = await Admin.findById(adminId);

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    let routeCharges;
    if (admin.role === 'branchAdmin' || admin.role === 'staffAdmin') {
      routeCharges = await RouteCharge.find({ branch: admin.branch })
        .populate('route', 'routeName routeCode')
        .populate('routeStop', 'stopName stopOrder')
        .populate('branch', 'branchName branchCode')
        .populate('createdBy', 'email role');
    } else if (admin.role === 'clientAdmin') {
      routeCharges = await RouteCharge.find({ client: admin.client })
        .populate('route', 'routeName routeCode')
        .populate('routeStop', 'stopName stopOrder')
        .populate('branch', 'branchName branchCode')
        .populate('createdBy', 'email role');
    } else {
      routeCharges = await RouteCharge.find()
        .populate('route', 'routeName routeCode')
        .populate('routeStop', 'stopName stopOrder')
        .populate('branch', 'branchName branchCode')
        .populate('client', 'name')
        .populate('createdBy', 'email role');
    }

    res.status(200).json({ routeCharges });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Route Charge By ID
exports.getRouteChargeById = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const routeCharge = await RouteCharge.findById(id)
      .populate('route', 'routeName routeCode startPoint endPoint')
      .populate('routeStop', 'stopName stopOrder pickupTime dropTime')
      .populate('branch', 'branchName branchCode')
      .populate('client', 'name')
      .populate('createdBy', 'email role');

    if (!routeCharge) {
      return res.status(404).json({ message: 'Route charge not found' });
    }

    if (admin.role === 'branchAdmin' && routeCharge.branch._id.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (admin.role === 'clientAdmin' && routeCharge.client._id.toString() !== admin.client.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.status(200).json({ routeCharge });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Route Charge
exports.updateRouteCharge = async (req, res) => {
  try {
    const { id } = req.params;
    const { routeStopId, monthlyCharge, tripType, effectiveFrom } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || (admin.role !== 'branchAdmin' && admin.role !== 'staffAdmin')) {
      return res.status(403).json({ message: 'Only branch admin or staff can update route charges' });
    }

    const routeCharge = await RouteCharge.findById(id);
    if (!routeCharge) {
      return res.status(404).json({ message: 'Route charge not found' });
    }

    if (routeCharge.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (routeStopId !== undefined) {
      if (routeStopId) {
        const routeStop = await RouteStop.findById(routeStopId);
        if (!routeStop) {
          return res.status(404).json({ message: 'Route stop not found' });
        }
        if (routeStop.route.toString() !== routeCharge.route.toString()) {
          return res.status(400).json({ message: 'Route stop does not belong to the route' });
        }
      }
      routeCharge.routeStop = routeStopId || undefined;
    }

    if (monthlyCharge !== undefined) routeCharge.monthlyCharge = monthlyCharge;
    if (tripType) routeCharge.tripType = tripType;
    if (effectiveFrom) routeCharge.effectiveFrom = effectiveFrom;

    await routeCharge.save();
    res.status(200).json({ message: 'Route charge updated successfully', routeCharge });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete Route Charge
exports.deleteRouteCharge = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || (admin.role !== 'branchAdmin' && admin.role !== 'staffAdmin')) {
      return res.status(403).json({ message: 'Only branch admin or staff can delete route charges' });
    }

    const routeCharge = await RouteCharge.findById(id);
    if (!routeCharge) {
      return res.status(404).json({ message: 'Route charge not found' });
    }

    if (routeCharge.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await RouteCharge.findByIdAndDelete(id);
    res.status(200).json({ message: 'Route charge deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Toggle Route Charge Status
exports.toggleRouteChargeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || (admin.role !== 'branchAdmin' && admin.role !== 'staffAdmin')) {
      return res.status(403).json({ message: 'Only branch admin or staff can toggle route charge status' });
    }

    const routeCharge = await RouteCharge.findById(id);
    if (!routeCharge) {
      return res.status(404).json({ message: 'Route charge not found' });
    }

    if (routeCharge.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    routeCharge.status = !routeCharge.status;
    await routeCharge.save();

    res.status(200).json({ message: `Route charge status changed to ${routeCharge.status}`, routeCharge });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
