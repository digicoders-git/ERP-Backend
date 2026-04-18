const TransportAssignment = require('../model/TransportAssignment');
const Vehicle = require('../model/Vehicle');
const Driver = require('../model/Driver');
const Route = require('../model/Route');
const Admin = require('../model/Admin');

// Create Transport Assignment
exports.createAssignment = async (req, res) => {
  try {
    const { vehicleId, driverId, routeId, shift, fromDate, toDate } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || (admin.role !== 'branchAdmin' && admin.role !== 'staffAdmin')) {
      return res.status(403).json({ message: 'Only branch admin or staff can create transport assignments' });
    }

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }
    if (vehicle.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Vehicle does not belong to your branch' });
    }

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }
    if (driver.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Driver does not belong to your branch' });
    }

    const route = await Route.findById(routeId);
    if (!route) {
      return res.status(404).json({ message: 'Route not found' });
    }
    if (route.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Route does not belong to your branch' });
    }

    const newAssignment = new TransportAssignment({
      vehicle: vehicleId,
      driver: driverId,
      route: routeId,
      shift,
      fromDate,
      toDate,
      branch: admin.branch,
      client: admin.client,
      createdBy: adminId
    });

    await newAssignment.save();
    res.status(201).json({ message: 'Transport assignment created successfully', assignment: newAssignment });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Transport Assignments
exports.getAllAssignments = async (req, res) => {
  try {
    const currentUserId = req.userId;
    const currentUserRole = req.user.role;
    
    let branchId = req.user.branch;
    let clientId = req.user.client;

    let assignments;
    const adminBranchId = branchId?.toString();
    const adminClientId = clientId?.toString();
    if (currentUserRole === 'branchAdmin' || currentUserRole === 'staffAdmin' || currentUserRole === 'driver') {
      assignments = await TransportAssignment.find({ branch: adminBranchId })
        .populate('vehicle', 'vehicleNo vehicleType')
        .populate('driver', 'name licenseNo')
        .populate('route', 'routeName routeCode')
        .populate('branch', 'branchName branchCode')
        .populate('createdBy', 'email role');
    } else if (currentUserRole === 'clientAdmin') {
      assignments = await TransportAssignment.find({ client: adminClientId })
        .populate('vehicle', 'vehicleNo vehicleType')
        .populate('driver', 'name licenseNo')
        .populate('route', 'routeName routeCode')
        .populate('branch', 'branchName branchCode')
        .populate('createdBy', 'email role');
    } else {
      assignments = await TransportAssignment.find()
        .populate('vehicle', 'vehicleNo vehicleType')
        .populate('driver', 'name licenseNo')
        .populate('route', 'routeName routeCode')
        .populate('branch', 'branchName branchCode')
        .populate('client', 'name')
        .populate('createdBy', 'email role');
    }

    res.status(200).json({ assignments });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Transport Assignment By ID
exports.getAssignmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const assignment = await TransportAssignment.findById(id)
      .populate('vehicle', 'vehicleNo vehicleType vehicleCapacity')
      .populate('driver', 'name mobileNo licenseNo')
      .populate('route', 'routeName routeCode startPoint endPoint')
      .populate('branch', 'branchName branchCode')
      .populate('client', 'name')
      .populate('createdBy', 'email role');

    if (!assignment) {
      return res.status(404).json({ message: 'Transport assignment not found' });
    }

    if (admin.role === 'branchAdmin' && assignment.branch._id.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (admin.role === 'clientAdmin' && assignment.client._id.toString() !== admin.client.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.status(200).json({ assignment });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Transport Assignment
exports.updateAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const { vehicleId, driverId, routeId, shift, fromDate, toDate } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || (admin.role !== 'branchAdmin' && admin.role !== 'staffAdmin')) {
      return res.status(403).json({ message: 'Only branch admin or staff can update transport assignments' });
    }

    const assignment = await TransportAssignment.findById(id);
    if (!assignment) {
      return res.status(404).json({ message: 'Transport assignment not found' });
    }

    if (assignment.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (vehicleId && vehicleId !== assignment.vehicle.toString()) {
      const vehicle = await Vehicle.findById(vehicleId);
      if (!vehicle) {
        return res.status(404).json({ message: 'Vehicle not found' });
      }
      if (vehicle.branch.toString() !== admin.branch.toString()) {
        return res.status(403).json({ message: 'Vehicle does not belong to your branch' });
      }
      assignment.vehicle = vehicleId;
    }

    if (driverId && driverId !== assignment.driver.toString()) {
      const driver = await Driver.findById(driverId);
      if (!driver) {
        return res.status(404).json({ message: 'Driver not found' });
      }
      if (driver.branch.toString() !== admin.branch.toString()) {
        return res.status(403).json({ message: 'Driver does not belong to your branch' });
      }
      assignment.driver = driverId;
    }

    if (routeId && routeId !== assignment.route.toString()) {
      const route = await Route.findById(routeId);
      if (!route) {
        return res.status(404).json({ message: 'Route not found' });
      }
      if (route.branch.toString() !== admin.branch.toString()) {
        return res.status(403).json({ message: 'Route does not belong to your branch' });
      }
      assignment.route = routeId;
    }

    if (shift) assignment.shift = shift;
    if (fromDate) assignment.fromDate = fromDate;
    if (toDate !== undefined) assignment.toDate = toDate;

    await assignment.save();
    res.status(200).json({ message: 'Transport assignment updated successfully', assignment });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete Transport Assignment
exports.deleteAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || (admin.role !== 'branchAdmin' && admin.role !== 'staffAdmin')) {
      return res.status(403).json({ message: 'Only branch admin or staff can delete transport assignments' });
    }

    const assignment = await TransportAssignment.findById(id);
    if (!assignment) {
      return res.status(404).json({ message: 'Transport assignment not found' });
    }

    if (assignment.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await TransportAssignment.findByIdAndDelete(id);
    res.status(200).json({ message: 'Transport assignment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Toggle Transport Assignment Status
exports.toggleAssignmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || (admin.role !== 'branchAdmin' && admin.role !== 'staffAdmin')) {
      return res.status(403).json({ message: 'Only branch admin or staff can toggle assignment status' });
    }

    const assignment = await TransportAssignment.findById(id);
    if (!assignment) {
      return res.status(404).json({ message: 'Transport assignment not found' });
    }

    if (assignment.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    assignment.status = !assignment.status;
    await assignment.save();

    res.status(200).json({ message: `Assignment status changed to ${assignment.status}`, assignment });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

