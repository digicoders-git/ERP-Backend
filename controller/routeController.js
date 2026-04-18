const Route = require('../model/Route');
const Admin = require('../model/Admin');

// Create Route
exports.createRoute = async (req, res) => {
  try {
    const { routeName, routeCode, startPoint, endPoint, totalDistance } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || (admin.role !== 'branchAdmin' && admin.role !== 'staffAdmin')) {
      return res.status(403).json({ message: 'Only branch admin or staff can create routes' });
    }

    const existingRoute = await Route.findOne({ routeCode: routeCode.toUpperCase() });
    if (existingRoute) {
      return res.status(400).json({ message: 'Route code already exists' });
    }

    const newRoute = new Route({
      routeName,
      routeCode: routeCode.toUpperCase(),
      startPoint,
      endPoint,
      totalDistance,
      branch: admin.branch,
      client: admin.client,
      createdBy: adminId
    });

    await newRoute.save();
    res.status(201).json({ message: 'Route created successfully', route: newRoute });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Routes
exports.getAllRoutes = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;
    const currentUserId = req.userId;
    const currentUserRole = req.user.role;
    
    let branchId = req.user.branch;
    let clientId = req.user.client;

    const searchQuery = search ? {
      $or: [
        { routeName: { $regex: search, $options: 'i' } },
        { routeCode: { $regex: search, $options: 'i' } },
        { startPoint: { $regex: search, $options: 'i' } },
        { endPoint: { $regex: search, $options: 'i' } }
      ]
    } : {};

    let routes, total;
    if (currentUserRole === 'branchAdmin' || currentUserRole === 'staffAdmin' || currentUserRole === 'driver') {
      searchQuery.branch = branchId;
      routes = await Route.find(searchQuery)
        .populate('branch', 'branchName branchCode')
        .populate('createdBy', 'email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
      total = await Route.countDocuments(searchQuery);
    } else if (currentUserRole === 'clientAdmin') {
      searchQuery.client = clientId;
      routes = await Route.find(searchQuery)
        .populate('branch', 'branchName branchCode')
        .populate('createdBy', 'email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
      total = await Route.countDocuments(searchQuery);
    } else {
      routes = await Route.find(searchQuery)
        .populate('branch', 'branchName branchCode')
        .populate('client', 'name')
        .populate('createdBy', 'email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
      total = await Route.countDocuments(searchQuery);
    }

    res.status(200).json({ 
      routes, 
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get all routes error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Route By ID
exports.getRouteById = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const route = await Route.findById(id)
      .populate('branch', 'branchName branchCode')
      .populate('client', 'name')
      .populate('createdBy', 'email role');

    if (!route) {
      return res.status(404).json({ message: 'Route not found' });
    }

    if (admin.role === 'branchAdmin' && route.branch._id.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (admin.role === 'clientAdmin' && route.client._id.toString() !== admin.client.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.status(200).json({ route });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Route
exports.updateRoute = async (req, res) => {
  try {
    const { id } = req.params;
    const { routeName, routeCode, startPoint, endPoint, totalDistance } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || (admin.role !== 'branchAdmin' && admin.role !== 'staffAdmin')) {
      return res.status(403).json({ message: 'Only branch admin or staff can update routes' });
    }

    const route = await Route.findById(id);
    if (!route) {
      return res.status(404).json({ message: 'Route not found' });
    }

    if (route.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (routeCode && routeCode.toUpperCase() !== route.routeCode) {
      const existingRoute = await Route.findOne({ routeCode: routeCode.toUpperCase() });
      if (existingRoute) {
        return res.status(400).json({ message: 'Route code already exists' });
      }
    }

    if (routeName) route.routeName = routeName;
    if (routeCode) route.routeCode = routeCode.toUpperCase();
    if (startPoint) route.startPoint = startPoint;
    if (endPoint) route.endPoint = endPoint;
    if (totalDistance !== undefined) route.totalDistance = totalDistance;

    await route.save();
    res.status(200).json({ message: 'Route updated successfully', route });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete Route
exports.deleteRoute = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || (admin.role !== 'branchAdmin' && admin.role !== 'staffAdmin')) {
      return res.status(403).json({ message: 'Only branch admin or staff can delete routes' });
    }

    const route = await Route.findById(id);
    if (!route) {
      return res.status(404).json({ message: 'Route not found' });
    }

    if (route.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Route.findByIdAndDelete(id);
    res.status(200).json({ message: 'Route deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Toggle Route Status
exports.toggleRouteStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || (admin.role !== 'branchAdmin' && admin.role !== 'staffAdmin')) {
      return res.status(403).json({ message: 'Only branch admin or staff can toggle route status' });
    }

    const route = await Route.findById(id);
    if (!route) {
      return res.status(404).json({ message: 'Route not found' });
    }

    if (route.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    route.status = !route.status;
    await route.save();

    res.status(200).json({ message: `Route status changed to ${route.status}`, route });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
