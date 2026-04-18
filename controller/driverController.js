const Driver = require('../model/Driver');
const Admin = require('../model/Admin');
const bcrypt = require('bcryptjs');

// Create Driver
exports.createDriver = async (req, res) => {
  try {
    const { name, email, mobileNo, password, licenseNo, licenseExpiryDate, experience, address } = req.body;
    const adminId = req.userId;

    // Validate required fields
    if (!name || !email || !mobileNo || !password || !licenseNo || !licenseExpiryDate || experience === undefined) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    const admin = await Admin.findById(adminId).populate('branch').populate('client');
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    if (admin.role !== 'branchAdmin' && admin.role !== 'staffAdmin') {
      return res.status(403).json({ message: 'Only branch admin or staff can create drivers' });
    }

    // Check if email already exists
    const existingEmail = await Driver.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Check if license number already exists
    const existingDriver = await Driver.findOne({ licenseNo: licenseNo.toUpperCase() });
    if (existingDriver) {
      return res.status(400).json({ message: 'License number already exists' });
    }

    const newDriver = new Driver({
      name,
      email: email.toLowerCase(),
      mobileNo,
      password,
      licenseNo: licenseNo.toUpperCase(),
      licenseExpiryDate,
      experience,
      address: address || null,
      branch: admin.branch?._id || admin.branch,
      client: admin.client?._id || admin.client,
      createdBy: adminId
    });

    await newDriver.save();

    const driverData = newDriver.toObject();
    delete driverData.password;
    
    res.status(201).json({ 
      message: 'Driver created successfully', 
      driver: driverData,
      credentials: {
        email: email.toLowerCase(),
        password: password,
        message: 'Share these credentials with the driver for login'
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Drivers
exports.getAllDrivers = async (req, res) => {
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
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { mobileNo: { $regex: search, $options: 'i' } },
        { licenseNo: { $regex: search, $options: 'i' } }
      ]
    } : {};

    let drivers, total;
    const adminBranchId = branchId?.toString();
    const adminClientId = clientId?.toString();

    if (currentUserRole === 'branchAdmin' || currentUserRole === 'staffAdmin' || currentUserRole === 'driver') {
      searchQuery.branch = adminBranchId;
      drivers = await Driver.find(searchQuery)
        .populate('branch', 'branchName branchCode')
        .populate('createdBy', 'email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
      total = await Driver.countDocuments(searchQuery);
    } else if (currentUserRole === 'clientAdmin') {
      searchQuery.client = adminClientId;
      drivers = await Driver.find(searchQuery)
        .populate('branch', 'branchName branchCode')
        .populate('createdBy', 'email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
      total = await Driver.countDocuments(searchQuery);
    } else {
      drivers = await Driver.find(searchQuery)
        .populate('branch', 'branchName branchCode')
        .populate('client', 'name')
        .populate('createdBy', 'email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
      total = await Driver.countDocuments(searchQuery);
    }

    res.status(200).json({ 
      drivers, 
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get all drivers error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Driver By ID
exports.getDriverById = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId).populate('branch').populate('client');
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const driver = await Driver.findById(id)
      .populate('branch', 'branchName branchCode')
      .populate('client', 'name')
      .populate('createdBy', 'email role');

    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    const adminBranchId = admin.branch?._id?.toString() || admin.branch?.toString();
    const driverBranchId = driver.branch?._id?.toString() || driver.branch?.toString();

    if (admin.role === 'branchAdmin' && driverBranchId !== adminBranchId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const adminClientId = admin.client?._id?.toString() || admin.client?.toString();
    const driverClientId = driver.client?._id?.toString() || driver.client?.toString();

    if (admin.role === 'clientAdmin' && driverClientId !== adminClientId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.status(200).json({ driver });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Driver
exports.updateDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, mobileNo, password, licenseNo, licenseExpiryDate, experience, address } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId).populate('branch').populate('client');
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    if (admin.role !== 'branchAdmin' && admin.role !== 'staffAdmin') {
      return res.status(403).json({ message: 'Only branch admin or staff can update drivers' });
    }

    const driver = await Driver.findById(id);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    const adminBranchId = admin.branch?._id?.toString() || admin.branch?.toString();
    const driverBranchId = driver.branch?.toString();

    if (driverBranchId !== adminBranchId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if email is being changed and if new email already exists
    if (email && email.toLowerCase() !== driver.email) {
      const existingEmail = await Driver.findOne({ email: email.toLowerCase(), _id: { $ne: id } });
      if (existingEmail) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }

    // Check if license number is being changed and if new license already exists
    if (licenseNo && licenseNo.toUpperCase() !== driver.licenseNo) {
      const existingDriver = await Driver.findOne({ licenseNo: licenseNo.toUpperCase(), _id: { $ne: id } });
      if (existingDriver) {
        return res.status(400).json({ message: 'License number already exists' });
      }
    }

    if (name) driver.name = name;
    if (email) driver.email = email.toLowerCase();
    if (mobileNo) driver.mobileNo = mobileNo;
    if (licenseNo) driver.licenseNo = licenseNo.toUpperCase();
    if (licenseExpiryDate) driver.licenseExpiryDate = licenseExpiryDate;
    if (experience !== undefined && experience !== '') driver.experience = experience;
    if (address !== undefined) driver.address = address;
    if (password && password.trim()) driver.password = password;

    await driver.save();

    const driverData = driver.toObject();
    delete driverData.password;
    res.status(200).json({ message: 'Driver updated successfully', driver: driverData });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete Driver
exports.deleteDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId).populate('branch').populate('client');
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    if (admin.role !== 'branchAdmin' && admin.role !== 'staffAdmin') {
      return res.status(403).json({ message: 'Only branch admin or staff can delete drivers' });
    }

    const driver = await Driver.findById(id);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    const adminBranchId = admin.branch?._id?.toString() || admin.branch?.toString();
    const driverBranchId = driver.branch?.toString();

    if (driverBranchId !== adminBranchId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Driver.findByIdAndDelete(id);
    res.status(200).json({ message: 'Driver deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Toggle Driver Status
exports.toggleDriverStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId).populate('branch').populate('client');
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    if (admin.role !== 'branchAdmin' && admin.role !== 'staffAdmin') {
      return res.status(403).json({ message: 'Only branch admin or staff can toggle driver status' });
    }

    const driver = await Driver.findById(id);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    const adminBranchId = admin.branch?._id?.toString() || admin.branch?.toString();
    const driverBranchId = driver.branch?.toString();

    if (driverBranchId !== adminBranchId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    driver.status = !driver.status;
    await driver.save();

    res.status(200).json({ message: `Driver status changed to ${driver.status}`, driver });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
