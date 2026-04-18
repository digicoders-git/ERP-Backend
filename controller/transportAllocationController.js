const TransportAllocation = require('../model/TransportAllocation');
const Route = require('../model/Route');
const RouteStop = require('../model/RouteStop');
const Vehicle = require('../model/Vehicle');
const Admin = require('../model/Admin');

// Create Transport Allocation
exports.createAllocation = async (req, res) => {
  try {
    const { userName, userType, routeId, routeStopId, vehicleId, monthlyCharges, service, joiningDate, studentId, staffId } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || (admin.role !== 'branchAdmin' && admin.role !== 'staffAdmin')) {
      return res.status(403).json({ message: 'Only branch admin or staff can create transport allocations' });
    }

    const route = await Route.findById(routeId);
    if (!route) {
      return res.status(404).json({ message: 'Route not found' });
    }
    if (route.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Route does not belong to your branch' });
    }

    const routeStop = await RouteStop.findById(routeStopId);
    if (!routeStop) {
      return res.status(404).json({ message: 'Route stop not found' });
    }
    if (routeStop.route.toString() !== routeId) {
      return res.status(400).json({ message: 'Route stop does not belong to the selected route' });
    }

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }
    if (vehicle.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Vehicle does not belong to your branch' });
    }

    const newAllocation = new TransportAllocation({
      userName,
      userType,
      route: routeId,
      routeStop: routeStopId,
      vehicle: vehicleId,
      monthlyCharges,
      service,
      joiningDate,
      student: studentId || null,
      staff: staffId || null,
      branch: admin.branch,
      client: admin.client,
      createdBy: adminId
    });

    await newAllocation.save();
    res.status(201).json({ message: 'Transport allocation created successfully', allocation: newAllocation });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Transport Allocations
exports.getAllAllocations = async (req, res) => {
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
        { userName: { $regex: search, $options: 'i' } }
      ]
    } : {};

    let allocations, total;
    if (currentUserRole === 'branchAdmin' || currentUserRole === 'staffAdmin' || currentUserRole === 'driver') {
      searchQuery.branch = branchId;
      allocations = await TransportAllocation.find(searchQuery)
        .populate('route', 'routeName routeCode')
        .populate('routeStop', 'stopName stopOrder')
        .populate('vehicle', 'vehicleNo vehicleType')
        .populate('branch', 'branchName branchCode')
        .populate('createdBy', 'email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
      total = await TransportAllocation.countDocuments(searchQuery);
    } else if (currentUserRole === 'clientAdmin') {
      searchQuery.client = clientId;
      allocations = await TransportAllocation.find(searchQuery)
        .populate('route', 'routeName routeCode')
        .populate('routeStop', 'stopName stopOrder')
        .populate('vehicle', 'vehicleNo vehicleType')
        .populate('branch', 'branchName branchCode')
        .populate('createdBy', 'email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
      total = await TransportAllocation.countDocuments(searchQuery);
    } else {
      allocations = await TransportAllocation.find(searchQuery)
        .populate('route', 'routeName routeCode')
        .populate('routeStop', 'stopName stopOrder')
        .populate('vehicle', 'vehicleNo vehicleType')
        .populate('branch', 'branchName branchCode')
        .populate('client', 'name')
        .populate('createdBy', 'email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
      total = await TransportAllocation.countDocuments(searchQuery);
    }

    res.status(200).json({ 
      allocations, 
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get all allocations error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Transport Allocation By ID
exports.getAllocationById = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const allocation = await TransportAllocation.findById(id)
      .populate('route', 'routeName routeCode startPoint endPoint')
      .populate('routeStop', 'stopName stopOrder pickupTime dropTime')
      .populate('vehicle', 'vehicleNo vehicleType vehicleCapacity')
      .populate('branch', 'branchName branchCode')
      .populate('client', 'name')
      .populate('createdBy', 'email role');

    if (!allocation) {
      return res.status(404).json({ message: 'Transport allocation not found' });
    }

    if (admin.role === 'branchAdmin' && allocation.branch._id.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (admin.role === 'clientAdmin' && allocation.client._id.toString() !== admin.client.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.status(200).json({ allocation });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Transport Allocation
exports.updateAllocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { userName, userType, routeId, routeStopId, vehicleId, monthlyCharges, service, joiningDate } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || (admin.role !== 'branchAdmin' && admin.role !== 'staffAdmin')) {
      return res.status(403).json({ message: 'Only branch admin or staff can update transport allocations' });
    }

    const allocation = await TransportAllocation.findById(id);
    if (!allocation) {
      return res.status(404).json({ message: 'Transport allocation not found' });
    }

    if (allocation.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (routeId && routeId !== allocation.route.toString()) {
      const route = await Route.findById(routeId);
      if (!route) {
        return res.status(404).json({ message: 'Route not found' });
      }
      if (route.branch.toString() !== admin.branch.toString()) {
        return res.status(403).json({ message: 'Route does not belong to your branch' });
      }
      allocation.route = routeId;
    }

    if (routeStopId && routeStopId !== allocation.routeStop.toString()) {
      const routeStop = await RouteStop.findById(routeStopId);
      if (!routeStop) {
        return res.status(404).json({ message: 'Route stop not found' });
      }
      const currentRouteId = routeId || allocation.route.toString();
      if (routeStop.route.toString() !== currentRouteId) {
        return res.status(400).json({ message: 'Route stop does not belong to the selected route' });
      }
      allocation.routeStop = routeStopId;
    }

    if (vehicleId && vehicleId !== allocation.vehicle.toString()) {
      const vehicle = await Vehicle.findById(vehicleId);
      if (!vehicle) {
        return res.status(404).json({ message: 'Vehicle not found' });
      }
      if (vehicle.branch.toString() !== admin.branch.toString()) {
        return res.status(403).json({ message: 'Vehicle does not belong to your branch' });
      }
      allocation.vehicle = vehicleId;
    }

    if (userName) allocation.userName = userName;
    if (userType) allocation.userType = userType;
    if (monthlyCharges !== undefined) allocation.monthlyCharges = monthlyCharges;
    if (service) allocation.service = service;
    if (joiningDate) allocation.joiningDate = joiningDate;

    await allocation.save();
    res.status(200).json({ message: 'Transport allocation updated successfully', allocation });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete Transport Allocation
exports.deleteAllocation = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || (admin.role !== 'branchAdmin' && admin.role !== 'staffAdmin')) {
      return res.status(403).json({ message: 'Only branch admin or staff can delete transport allocations' });
    }

    const allocation = await TransportAllocation.findById(id);
    if (!allocation) {
      return res.status(404).json({ message: 'Transport allocation not found' });
    }

    if (allocation.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await TransportAllocation.findByIdAndDelete(id);
    res.status(200).json({ message: 'Transport allocation deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Toggle Transport Allocation Status
exports.toggleAllocationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || (admin.role !== 'branchAdmin' && admin.role !== 'staffAdmin')) {
      return res.status(403).json({ message: 'Only branch admin or staff can toggle allocation status' });
    }

    const allocation = await TransportAllocation.findById(id);
    if (!allocation) {
      return res.status(404).json({ message: 'Transport allocation not found' });
    }

    if (allocation.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    allocation.status = !allocation.status;
    await allocation.save();

    res.status(200).json({ message: `Allocation status changed to ${allocation.status}`, allocation });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
