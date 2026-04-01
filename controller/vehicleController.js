const Vehicle = require('../model/Vehicle');
const Admin = require('../model/Admin');
const Driver = require('../model/Driver');
const Route = require('../model/Route');
const TransportAssignment = require('../model/TransportAssignment');
const TransportAllocation = require('../model/TransportAllocation');

// Create Vehicle
exports.createVehicle = async (req, res) => {
  try {
    const { vehicleNo, vehicleType, vehicleCapacity, fuelType, rcNo, insuranceExpiryDate, fitnessExpiryDate } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || (admin.role !== 'branchAdmin' && admin.role !== 'staffAdmin')) {
      return res.status(403).json({ message: 'Only branch admin or staff can create vehicles' });
    }

    const existingVehicle = await Vehicle.findOne({ vehicleNo: vehicleNo.toUpperCase() });
    if (existingVehicle) {
      return res.status(400).json({ message: 'Vehicle number already exists' });
    }

    const newVehicle = new Vehicle({
      vehicleNo: vehicleNo.toUpperCase(),
      vehicleType,
      vehicleCapacity,
      fuelType,
      rcNo,
      insuranceExpiryDate,
      fitnessExpiryDate,
      branch: admin.branch,
      client: admin.client,
      createdBy: adminId
    });

    await newVehicle.save();
    res.status(201).json({ message: 'Vehicle created successfully', vehicle: newVehicle });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Vehicles
exports.getAllVehicles = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const skip = (page - 1) * limit;
    const adminId = req.userId;
    const admin = await Admin.findById(adminId);

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const searchQuery = search ? {
      $or: [
        { vehicleNo: { $regex: search, $options: 'i' } },
        { rcNo: { $regex: search, $options: 'i' } }
      ]
    } : {};

    let vehicles, total;
    if (admin.role === 'branchAdmin' || admin.role === 'staffAdmin') {
      searchQuery.branch = admin.branch;
      vehicles = await Vehicle.find(searchQuery)
        .populate('branch', 'branchName branchCode')
        .populate('createdBy', 'email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      total = await Vehicle.countDocuments(searchQuery);
    } else if (admin.role === 'clientAdmin') {
      searchQuery.client = admin.client;
      vehicles = await Vehicle.find(searchQuery)
        .populate('branch', 'branchName branchCode')
        .populate('createdBy', 'email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      total = await Vehicle.countDocuments(searchQuery);
    } else {
      vehicles = await Vehicle.find(searchQuery)
        .populate('branch', 'branchName branchCode')
        .populate('client', 'name')
        .populate('createdBy', 'email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      total = await Vehicle.countDocuments(searchQuery);
    }

    res.status(200).json({ 
      vehicles, 
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Vehicle By ID
exports.getVehicleById = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const vehicle = await Vehicle.findById(id)
      .populate('branch', 'branchName branchCode')
      .populate('client', 'name')
      .populate('createdBy', 'email role');

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    if (admin.role === 'branchAdmin' && vehicle.branch._id.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (admin.role === 'clientAdmin' && vehicle.client._id.toString() !== admin.client.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.status(200).json({ vehicle });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Vehicle
exports.updateVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const { vehicleNo, vehicleType, vehicleCapacity, fuelType, rcNo, insuranceExpiryDate, fitnessExpiryDate } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || (admin.role !== 'branchAdmin' && admin.role !== 'staffAdmin')) {
      return res.status(403).json({ message: 'Only branch admin or staff can update vehicles' });
    }

    const vehicle = await Vehicle.findById(id);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    if (vehicle.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (vehicleNo && vehicleNo.toUpperCase() !== vehicle.vehicleNo) {
      const existingVehicle = await Vehicle.findOne({ vehicleNo: vehicleNo.toUpperCase() });
      if (existingVehicle) {
        return res.status(400).json({ message: 'Vehicle number already exists' });
      }
    }

    if (vehicleNo) vehicle.vehicleNo = vehicleNo.toUpperCase();
    if (vehicleType) vehicle.vehicleType = vehicleType;
    if (vehicleCapacity) vehicle.vehicleCapacity = vehicleCapacity;
    if (fuelType) vehicle.fuelType = fuelType;
    if (rcNo) vehicle.rcNo = rcNo;
    if (insuranceExpiryDate) vehicle.insuranceExpiryDate = insuranceExpiryDate;
    if (fitnessExpiryDate) vehicle.fitnessExpiryDate = fitnessExpiryDate;

    await vehicle.save();
    res.status(200).json({ message: 'Vehicle updated successfully', vehicle });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete Vehicle
exports.deleteVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || (admin.role !== 'branchAdmin' && admin.role !== 'staffAdmin')) {
      return res.status(403).json({ message: 'Only branch admin or staff can delete vehicles' });
    }

    const vehicle = await Vehicle.findById(id);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    if (vehicle.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Vehicle.findByIdAndDelete(id);
    res.status(200).json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Transport Dashboard Stats
exports.getTransportDashboardStats = async (req, res) => {
  try {
    const admin = await Admin.findById(req.userId);
    if (!admin || (admin.role !== 'branchAdmin' && admin.role !== 'staffAdmin')) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const branchId = admin.branch;

    const [totalVehicles, activeVehicles, totalDrivers, activeDrivers, totalRoutes, totalAssignments, totalAllocations] = await Promise.all([
      Vehicle.countDocuments({ branch: branchId }),
      Vehicle.countDocuments({ branch: branchId, status: true }),
      Driver.countDocuments({ branch: branchId }),
      Driver.countDocuments({ branch: branchId, status: true }),
      Route.countDocuments({ branch: branchId }),
      TransportAssignment.countDocuments({ branch: branchId, status: true }),
      TransportAllocation.countDocuments({ branch: branchId, status: true })
    ]);

    const recentAllocations = await TransportAllocation.find({ branch: branchId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('route', 'routeName routeCode')
      .populate('vehicle', 'vehicleNo vehicleType')
      .select('userName userType monthlyCharges service joiningDate createdAt');

    res.status(200).json({
      stats: {
        totalVehicles,
        activeVehicles,
        totalDrivers,
        activeDrivers,
        totalRoutes,
        totalAssignments,
        totalAllocations
      },
      recentAllocations
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Toggle Vehicle Status
exports.toggleVehicleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || (admin.role !== 'branchAdmin' && admin.role !== 'staffAdmin')) {
      return res.status(403).json({ message: 'Only branch admin or staff can toggle vehicle status' });
    }

    const vehicle = await Vehicle.findById(id);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    if (vehicle.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    vehicle.status = !vehicle.status;
    await vehicle.save();

    res.status(200).json({ message: `Vehicle status changed to ${vehicle.status}`, vehicle });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
