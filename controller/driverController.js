const Driver = require('../model/Driver');
const Admin = require('../model/Admin');
const bcrypt = require('bcryptjs');

// Create Driver
exports.createDriver = async (req, res) => {
  try {
    const { name, mobileNo, password, licenseNo, licenseExpiryDate, experience } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || (admin.role !== 'branchAdmin' && admin.role !== 'staffAdmin')) {
      return res.status(403).json({ message: 'Only branch admin or staff can create drivers' });
    }

    const existingDriver = await Driver.findOne({ licenseNo: licenseNo.toUpperCase() });
    if (existingDriver) {
      return res.status(400).json({ message: 'License number already exists' });
    }

    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    const newDriver = new Driver({
      name,
      mobileNo,
      licenseNo: licenseNo.toUpperCase(),
      licenseExpiryDate,
      experience,
      branch: admin.branch,
      client: admin.client,
      createdBy: adminId
    });

    await newDriver.save();

    if (hashedPassword) {
      await Driver.findByIdAndUpdate(newDriver._id, { password: hashedPassword });
    }

    const driverData = newDriver.toObject();
    delete driverData.password;
    res.status(201).json({ message: 'Driver created successfully', driver: driverData });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Drivers
exports.getAllDrivers = async (req, res) => {
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
        { name: { $regex: search, $options: 'i' } },
        { mobileNo: { $regex: search, $options: 'i' } },
        { licenseNo: { $regex: search, $options: 'i' } }
      ]
    } : {};

    let drivers, total;
    if (admin.role === 'branchAdmin' || admin.role === 'staffAdmin') {
      searchQuery.branch = admin.branch;
      drivers = await Driver.find(searchQuery)
        .populate('branch', 'branchName branchCode')
        .populate('createdBy', 'email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      total = await Driver.countDocuments(searchQuery);
    } else if (admin.role === 'clientAdmin') {
      searchQuery.client = admin.client;
      drivers = await Driver.find(searchQuery)
        .populate('branch', 'branchName branchCode')
        .populate('createdBy', 'email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      total = await Driver.countDocuments(searchQuery);
    } else {
      drivers = await Driver.find(searchQuery)
        .populate('branch', 'branchName branchCode')
        .populate('client', 'name')
        .populate('createdBy', 'email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      total = await Driver.countDocuments(searchQuery);
    }

    res.status(200).json({ 
      drivers, 
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

// Get Driver By ID
exports.getDriverById = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
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

    if (admin.role === 'branchAdmin' && driver.branch._id.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (admin.role === 'clientAdmin' && driver.client._id.toString() !== admin.client.toString()) {
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
    const { name, mobileNo, password, licenseNo, licenseExpiryDate, experience } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || (admin.role !== 'branchAdmin' && admin.role !== 'staffAdmin')) {
      return res.status(403).json({ message: 'Only branch admin or staff can update drivers' });
    }

    const driver = await Driver.findById(id);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    if (driver.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (licenseNo && licenseNo.toUpperCase() !== driver.licenseNo) {
      const existingDriver = await Driver.findOne({ licenseNo: licenseNo.toUpperCase() });
      if (existingDriver) {
        return res.status(400).json({ message: 'License number already exists' });
      }
    }

    if (name) driver.name = name;
    if (mobileNo) driver.mobileNo = mobileNo;
    if (licenseNo) driver.licenseNo = licenseNo.toUpperCase();
    if (licenseExpiryDate) driver.licenseExpiryDate = licenseExpiryDate;
    if (experience !== undefined) driver.experience = experience;

    if (password) {
      await Driver.findByIdAndUpdate(id, { password: await bcrypt.hash(password, 10) });
    }

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

    const admin = await Admin.findById(adminId);
    if (!admin || (admin.role !== 'branchAdmin' && admin.role !== 'staffAdmin')) {
      return res.status(403).json({ message: 'Only branch admin or staff can delete drivers' });
    }

    const driver = await Driver.findById(id);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    if (driver.branch.toString() !== admin.branch.toString()) {
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

    const admin = await Admin.findById(adminId);
    if (!admin || (admin.role !== 'branchAdmin' && admin.role !== 'staffAdmin')) {
      return res.status(403).json({ message: 'Only branch admin or staff can toggle driver status' });
    }

    const driver = await Driver.findById(id);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    if (driver.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    driver.status = !driver.status;
    await driver.save();

    res.status(200).json({ message: `Driver status changed to ${driver.status}`, driver });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
