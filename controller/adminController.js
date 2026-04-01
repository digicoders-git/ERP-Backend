const Admin = require('../model/Admin');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Create Super Admin
exports.createSuperAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Admin already exists' });
    }

    const admin = new Admin({ email, password, role: 'superAdmin' });
    await admin.save();

    res.status(201).json({ message: 'Super Admin created successfully', email: admin.email });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Login Admin
exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const admin = await Admin.findOne({ email }).populate('client', 'name').populate('branch', 'branchName branchCode');
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!admin.status) {
      return res.status(403).json({ message: 'Account is inactive' });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ _id: admin._id, role: admin.role, email: admin.email, branch: admin.branch?._id, client: admin.client?._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({ 
      message: 'Login successful', 
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        role: admin.role,
        allowedPanels: admin.allowedPanels,
        client: admin.client,
        branch: admin.branch
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Password
exports.updatePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Old password and new password are required' });
    }

    const admin = await Admin.findById(req.userId);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const isMatch = await admin.comparePassword(oldPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Old password is incorrect' });
    }

    admin.password = newPassword;
    await admin.save();

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Toggle Admin Status
exports.toggleStatus = async (req, res) => {
  try {
    const { adminId } = req.params;

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    admin.status = !admin.status;
    await admin.save();

    res.status(200).json({ message: 'Status updated successfully', status: admin.status });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Dashboard Stats
exports.getDashboardStats = async (req, res) => {
  try {
    const Client = require('../model/Client');
    const Plan = require('../model/Plan');
    const Branch = require('../model/Branch');

    const [totalClients, totalPlans, totalBranches, activePlans, activeClients, inactiveClients, recentClients, topRatedClients] = await Promise.all([
      Client.countDocuments(),
      Plan.countDocuments(),
      Branch.countDocuments(),
      Plan.countDocuments({ status: true }),
      Client.countDocuments({ status: 'active' }),
      Client.countDocuments({ status: 'inactive' }),
      Client.find().sort({ createdAt: -1 }).limit(5).populate('plan', 'planName planType'),
      Client.find({ rating: { $gte: 4 } }).sort({ rating: -1 }).limit(5).populate('plan', 'planName')
    ]);

    // Calculate total students across all clients
    const clientsWithStudents = await Client.find({}, 'students');
    const totalStudents = clientsWithStudents.reduce((sum, client) => sum + (client.students || 0), 0);

    res.status(200).json({
      stats: {
        totalClients,
        totalPlans,
        totalBranches,
        activePlans,
        activeClients,
        inactiveClients,
        totalStudents
      },
      recentClients,
      topRatedClients
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
