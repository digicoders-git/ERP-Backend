const Staff = require('../model/Staff');
const Admin = require('../model/Admin');
const path = require('path');
const fs = require('fs');

// Create Staff (Only by Branch Admin)
exports.createStaff = async (req, res) => {
  try {
    const { name, email, mobile, password, qualification, experience, salary, address } = req.body;

    if (!name || !email || !mobile || !password) {
      return res.status(400).json({ message: 'Name, email, mobile, and password are required' });
    }

    // Get branch admin details
    const branchAdmin = await Admin.findById(req.userId).populate('branch');
    if (!branchAdmin || branchAdmin.role !== 'branchAdmin') {
      return res.status(403).json({ message: 'Only branch admin can create staff' });
    }

    // Check if email already exists in Admin
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Email already exists in Admin' });
    }

    // Check if email already exists in Staff
    const existingStaff = await Staff.findOne({ email });
    if (existingStaff) {
      return res.status(400).json({ message: 'Email already exists in Staff' });
    }

    // Handle profile image
    let profileImagePath = null;
    if (req.file) {
      profileImagePath = `/uploads/staff/${req.file.filename}`;
    }

    // Generate Random Staff ID
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const staffId = `ST${randomDigits}`;

    // Create Staff
    const staff = new Staff({
      name,
      email,
      mobile,
      staffId,
      profileImage: profileImagePath,
      qualification,
      experience,
      salary,
      address,
      branch: branchAdmin.branch._id,
      client: branchAdmin.client,
      createdBy: req.userId,
      status: true
    });
    await staff.save();

    // Create Staff Admin
    const staffAdmin = new Admin({
      email,
      password,
      role: 'staffAdmin',
      client: branchAdmin.client,
      branch: branchAdmin.branch._id,
      staff: staff._id,
      allowedPanels: [],
      status: true
    });
    await staffAdmin.save();

    res.status(201).json({
      message: 'Staff and Staff Admin created successfully',
      staff: {
        id: staff._id,
        name: staff.name,
        email: staff.email,
        mobile: staff.mobile,
        staffId: staff.staffId,
        profileImage: staff.profileImage,
        qualification: staff.qualification,
        experience: staff.experience,
        salary: staff.salary,
        address: staff.address,
        status: staff.status
      },
      admin: {
        id: staffAdmin._id,
        email: staffAdmin.email,
        role: staffAdmin.role
      }
    });
  } catch (error) {
    // Delete uploaded file if error occurs
    if (req.file) {
      const filePath = path.join(__dirname, '..', 'uploads', 'staff', req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Staff (By Branch Admin)
exports.getAllStaff = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const skip = (page - 1) * limit;
    const admin = await Admin.findById(req.userId);

    const searchQuery = search ? {
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
        { qualification: { $regex: search, $options: 'i' } }
      ]
    } : {};

    if (admin.role === 'branchAdmin') {
      searchQuery.branch = admin.branch;
      const staff = await Staff.find(searchQuery)
        .populate('createdBy', 'email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Staff.countDocuments(searchQuery);
      return res.status(200).json({ 
        staff, 
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit)
        }
      });
    }

    if (admin.role === 'clientAdmin') {
      searchQuery.client = admin.client;
      const staff = await Staff.find(searchQuery)
        .populate('branch', 'branchName branchCode')
        .populate('createdBy', 'email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Staff.countDocuments(searchQuery);
      return res.status(200).json({ 
        staff, 
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit)
        }
      });
    }

    if (admin.role === 'superAdmin') {
      const staff = await Staff.find(searchQuery)
        .populate('branch', 'branchName branchCode')
        .populate('client', 'name')
        .populate('createdBy', 'email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Staff.countDocuments(searchQuery);
      return res.status(200).json({ 
        staff, 
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit)
        }
      });
    }

    return res.status(403).json({ message: 'Access denied' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Single Staff
exports.getStaffById = async (req, res) => {
  try {
    const { staffId } = req.params;
    const admin = await Admin.findById(req.userId);

    const staff = await Staff.findById(staffId)
      .populate('branch', 'branchName branchCode address')
      .populate('client', 'name')
      .populate('createdBy', 'email');

    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    // Check access rights
    if (admin.role === 'branchAdmin' && staff.branch._id.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (admin.role === 'clientAdmin' && staff.client._id.toString() !== admin.client.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (admin.role === 'staffAdmin' && staff._id.toString() !== admin.staff.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get staff admin details
    const staffAdmin = await Admin.findOne({ staff: staffId, role: 'staffAdmin' }).select('-password');

    res.status(200).json({ staff, admin: staffAdmin });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Staff
exports.updateStaff = async (req, res) => {
  try {
    const { staffId } = req.params;
    const { name, mobile, qualification, experience, salary, address, password } = req.body;

    const admin = await Admin.findById(req.userId);
    if (admin.role !== 'branchAdmin' && admin.role !== 'superAdmin') {
      return res.status(403).json({ message: 'Only branch admin or super admin can update staff' });
    }

    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    // Check if branch admin owns this staff
    if (admin.role === 'branchAdmin' && staff.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (name) staff.name = name;
    if (mobile) staff.mobile = mobile;
    if (qualification !== undefined) staff.qualification = qualification;
    if (experience !== undefined) staff.experience = experience;
    if (salary !== undefined) staff.salary = salary;
    if (address !== undefined) staff.address = address;

    // Handle profile image update
    if (req.file) {
      // Delete old image if exists
      if (staff.profileImage) {
        const oldImagePath = path.join(__dirname, '..', staff.profileImage);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      staff.profileImage = `/uploads/staff/${req.file.filename}`;
    }

    await staff.save();

    // Update staff admin password if provided
    if (password) {
      const staffAdmin = await Admin.findOne({ staff: staffId, role: 'staffAdmin' });
      if (staffAdmin) {
        staffAdmin.password = password;
        await staffAdmin.save();
      }
    }

    res.status(200).json({ message: 'Staff updated successfully', staff });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete Staff
exports.deleteStaff = async (req, res) => {
  try {
    const { staffId } = req.params;

    const admin = await Admin.findById(req.userId);
    if (admin.role !== 'branchAdmin' && admin.role !== 'superAdmin') {
      return res.status(403).json({ message: 'Only branch admin or super admin can delete staff' });
    }

    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    // Check if branch admin owns this staff
    if (admin.role === 'branchAdmin' && staff.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Delete profile image if exists
    if (staff.profileImage) {
      const imagePath = path.join(__dirname, '..', staff.profileImage);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Delete staff admin
    await Admin.deleteOne({ staff: staffId, role: 'staffAdmin' });

    // Delete staff
    await Staff.findByIdAndDelete(staffId);

    res.status(200).json({ message: 'Staff and associated admin deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Toggle Staff Status
exports.toggleStaffStatus = async (req, res) => {
  try {
    const { staffId } = req.params;

    const admin = await Admin.findById(req.userId);
    if (admin.role !== 'branchAdmin' && admin.role !== 'superAdmin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    // Check if branch admin owns this staff
    if (admin.role === 'branchAdmin' && staff.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    staff.status = !staff.status;
    await staff.save();

    // Also toggle staff admin status
    await Admin.updateOne(
      { staff: staffId, role: 'staffAdmin' },
      { status: staff.status }
    );

    res.status(200).json({ message: 'Staff status updated successfully', status: staff.status });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
