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
    const { email, password, panel } = req.body;

    console.log('[LOGIN] Starting login attempt:', { email, panel });

    if (!email || !password) {
      console.log('[LOGIN] Missing credentials');
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Panel → allowed roles mapping
    const PANEL_ROLES = {
      superAdmin:   ['superAdmin'],
      schoolAdmin:  ['clientAdmin'],
      branchAdmin:  ['branchAdmin'],
      staffAdmin:   ['staffAdmin'],
      teacherAdmin: ['teacherAdmin'],
      feeAdmin:     ['feeAdmin', 'feeManager'],
      wardenAdmin:  ['wardenAdmin'],
      libraryAdmin: ['libraryAdmin'],
    };

    console.log('[LOGIN] Searching for admin with email:', email);
    const admin = await Admin.findOne({ email })
      .populate('client', 'purchasedPanels')
      .populate('branch', 'branchName branchCode');
    
    if (!admin) {
      console.log('[LOGIN] Admin not found:', email);
      return res.status(401).json({ message: 'Invalid credentials', code: 'ADMIN_NOT_FOUND' });
    }

    console.log('[LOGIN] Admin found:', { 
      email: admin.email, 
      role: admin.role, 
      status: admin.status,
      hasClient: !!admin.client 
    });

    if (admin.status === false) {
      console.log('[LOGIN] Account inactive:', email);
      return res.status(403).json({ message: 'Account is inactive', code: 'ACCOUNT_INACTIVE' });
    }

    console.log('[LOGIN] Comparing passwords for:', email);
    const isMatch = await admin.comparePassword(password);
    console.log('[LOGIN] Password match result:', isMatch);
    
    if (!isMatch) {
      console.log('[LOGIN] Invalid password for:', email);
      return res.status(401).json({ message: 'Invalid credentials', code: 'INVALID_PASSWORD' });
    }

    // If panel is specified, validate role matches
    if (panel && PANEL_ROLES[panel]) {
      if (!PANEL_ROLES[panel].includes(admin.role)) {
        console.log('[LOGIN] Role mismatch - admin role:', admin.role, 'panel allowed:', PANEL_ROLES[panel]);
        return res.status(403).json({ message: 'Access denied. Invalid credentials for this panel.' });
      }
    }

    console.log('[LOGIN] Role validation passed');

    // Set allowedPanels based on client's purchasedPanels
    let allowedPanels = [];
    
    if (admin.role === 'superAdmin') {
      console.log('[LOGIN] SuperAdmin detected - assigning all panels');
      allowedPanels = ['school', 'staff', 'fee', 'warden', 'library', 'transport', 'teacher', 'parent', 'student'];
    } else if (!admin.client) {
      console.log('[LOGIN] Non-superadmin without client - denying access');
      return res.status(403).json({ message: 'No organization assigned to this account.' });
    } else if (admin.client.purchasedPanels && admin.client.purchasedPanels.length > 0) {
      console.log('[LOGIN] Client admin - assigning purchased panels:', admin.client.purchasedPanels);
      allowedPanels = admin.client.purchasedPanels;
    } else {
      console.log('[LOGIN] Client exists but no purchasedPanels assigned');
      return res.status(403).json({ message: 'No panels assigned to this account. Contact administrator.' });
    }

    console.log('[LOGIN] Generating JWT token');
    const token = jwt.sign(
      { _id: admin._id, role: admin.role, email: admin.email, branch: admin.branch?._id, client: admin.client?._id, allowedPanels: allowedPanels },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const responseData = {
      success: true,
      message: 'Login successful',
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        mobile: admin.mobile,
        address: admin.address,
        profileImage: admin.profileImage,
        role: admin.role,
        allowedPanels: allowedPanels,
        client: admin.client,
        branch: admin.branch
      }
    };

    console.log('[LOGIN] Login successful for:', email);
    console.log('[LOGIN] Response object created:', { success: true, role: admin.role, allowedPanels });
    
    return res.status(200).json(responseData);
  } catch (error) {
    console.error('[LOGIN] Unexpected error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
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
