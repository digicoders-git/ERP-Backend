const Warden = require('../model/Warden');
const Hostel = require('../model/Hostel');
const Admin = require('../model/Admin');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Create Warden
exports.createWarden = async (req, res) => {
  try {
    const { wardenName, email, password, gender, shift, assignedHostel } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || (admin.role !== 'branchAdmin' && admin.role !== 'staffAdmin')) {
      return res.status(403).json({ message: 'Only branch admin or staff can create wardens' });
    }

    const existingWarden = await Warden.findOne({ email });
    if (existingWarden) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const hostel = await Hostel.findById(assignedHostel);
    if (!hostel) {
      return res.status(404).json({ message: 'Hostel not found' });
    }

    if (hostel.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Hostel does not belong to your branch' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newWarden = new Warden({
      profileImage: req.file ? req.file.path : undefined,
      wardenName,
      email,
      password: hashedPassword,
      gender,
      shift,
      assignedHostel,
      branch: admin.branch,
      client: admin.client,
      createdBy: adminId
    });

    await newWarden.save();

    const wardenAdmin = new Admin({
      email,
      password: hashedPassword,
      role: 'wardenAdmin',
      client: admin.client,
      branch: admin.branch,
      warden: newWarden._id,
      allowedPanels: ['warden']
    });

    await wardenAdmin.save();

    res.status(201).json({ message: 'Warden created successfully', warden: newWarden });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Wardens
exports.getAllWardens = async (req, res) => {
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
        { wardenName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    } : {};

    let wardens, total;
    if (admin.role === 'branchAdmin' || admin.role === 'staffAdmin') {
      searchQuery.branch = admin.branch;
      wardens = await Warden.find(searchQuery)
        .populate('assignedHostel', 'hostelName hostelCode')
        .populate('branch', 'branchName branchCode')
        .populate('createdBy', 'email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      total = await Warden.countDocuments(searchQuery);
    } else if (admin.role === 'clientAdmin') {
      searchQuery.client = admin.client;
      wardens = await Warden.find(searchQuery)
        .populate('assignedHostel', 'hostelName hostelCode')
        .populate('branch', 'branchName branchCode')
        .populate('createdBy', 'email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      total = await Warden.countDocuments(searchQuery);
    } else {
      wardens = await Warden.find(searchQuery)
        .populate('assignedHostel', 'hostelName hostelCode')
        .populate('branch', 'branchName branchCode')
        .populate('client', 'name')
        .populate('createdBy', 'email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      total = await Warden.countDocuments(searchQuery);
    }

    res.status(200).json({ 
      wardens, 
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

// Get Warden By ID
exports.getWardenById = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const warden = await Warden.findById(id)
      .populate('assignedHostel', 'hostelName hostelCode type')
      .populate('branch', 'branchName branchCode')
      .populate('client', 'name')
      .populate('createdBy', 'email role');

    if (!warden) {
      return res.status(404).json({ message: 'Warden not found' });
    }

    if (admin.role === 'branchAdmin' && warden.branch._id.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (admin.role === 'clientAdmin' && warden.client._id.toString() !== admin.client.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.status(200).json({ warden });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Warden
exports.updateWarden = async (req, res) => {
  try {
    const { id } = req.params;
    const { wardenName, gender, shift, assignedHostel } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || (admin.role !== 'branchAdmin' && admin.role !== 'staffAdmin')) {
      return res.status(403).json({ message: 'Only branch admin or staff can update wardens' });
    }

    const warden = await Warden.findById(id);
    if (!warden) {
      return res.status(404).json({ message: 'Warden not found' });
    }

    if (warden.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (assignedHostel && assignedHostel !== warden.assignedHostel.toString()) {
      const hostel = await Hostel.findById(assignedHostel);
      if (!hostel) {
        return res.status(404).json({ message: 'Hostel not found' });
      }
      if (hostel.branch.toString() !== admin.branch.toString()) {
        return res.status(403).json({ message: 'Hostel does not belong to your branch' });
      }
      warden.assignedHostel = assignedHostel;
    }

    if (req.file) {
      if (warden.profileImage) {
        const oldImagePath = path.join(__dirname, '..', warden.profileImage);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      warden.profileImage = req.file.path;
    }

    if (wardenName) warden.wardenName = wardenName;
    if (gender) warden.gender = gender;
    if (shift) warden.shift = shift;

    await warden.save();
    res.status(200).json({ message: 'Warden updated successfully', warden });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete Warden
exports.deleteWarden = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || (admin.role !== 'branchAdmin' && admin.role !== 'staffAdmin')) {
      return res.status(403).json({ message: 'Only branch admin or staff can delete wardens' });
    }

    const warden = await Warden.findById(id);
    if (!warden) {
      return res.status(404).json({ message: 'Warden not found' });
    }

    if (warden.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (warden.profileImage) {
      const imagePath = path.join(__dirname, '..', warden.profileImage);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await Admin.findOneAndDelete({ warden: id });
    await Warden.findByIdAndDelete(id);

    res.status(200).json({ message: 'Warden deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Toggle Warden Status
exports.toggleWardenStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || (admin.role !== 'branchAdmin' && admin.role !== 'staffAdmin')) {
      return res.status(403).json({ message: 'Only branch admin or staff can toggle warden status' });
    }

    const warden = await Warden.findById(id);
    if (!warden) {
      return res.status(404).json({ message: 'Warden not found' });
    }

    if (warden.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    warden.status = warden.status === 'active' ? 'inactive' : 'active';
    await warden.save();

    const wardenAdmin = await Admin.findOne({ warden: id });
    if (wardenAdmin) {
      wardenAdmin.status = warden.status === 'active';
      await wardenAdmin.save();
    }

    res.status(200).json({ message: `Warden status changed to ${warden.status}`, warden });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
