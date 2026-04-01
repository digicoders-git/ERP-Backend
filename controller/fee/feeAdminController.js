const Admin = require('../../model/Admin');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: admin._id, role: admin.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      admin: {
        _id: admin._id,
        email: admin.email,
        role: admin.role,
        branch: admin.branch
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Profile
exports.getProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.userId)
      .populate('branch', 'branchName branchCode')
      .select('-password');

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    res.status(200).json({ admin });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Profile
exports.updateProfile = async (req, res) => {
  try {
    const { email } = req.body;
    const admin = await Admin.findById(req.userId);

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    if (email && email !== admin.email) {
      const existingAdmin = await Admin.findOne({ email });
      if (existingAdmin) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      admin.email = email;
    }

    await admin.save();
    res.status(200).json({
      message: 'Profile updated successfully',
      admin: {
        _id: admin._id,
        email: admin.email,
        role: admin.role,
        branch: admin.branch
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Change Password
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Old password and new password required' });
    }

    const admin = await Admin.findById(req.userId);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Old password is incorrect' });
    }

    admin.password = newPassword;
    await admin.save();

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create Fee Admin (by Branch Admin)
exports.createFeeAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const branchAdminId = req.userId;

    const branchAdmin = await Admin.findById(branchAdminId);
    
    if (!branchAdmin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    if (!['branchAdmin', 'staffAdmin'].includes(branchAdmin.role)) {
      return res.status(403).json({ 
        message: 'Access denied', 
        detail: `Your role is ${branchAdmin.role}. Only branchAdmin or staffAdmin can create fee admin` 
      });
    }

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Admin with this email already exists' });
    }

    const feeAdmin = new Admin({
      email,
      password,
      role: 'feeAdmin',
      client: branchAdmin.client,
      branch: branchAdmin.branch,
      allowedPanels: ['fee']
    });

    await feeAdmin.save();
    res.status(201).json({ message: 'Fee Admin created successfully', feeAdmin: { email: feeAdmin.email, role: feeAdmin.role } });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Fee Admins (by Branch Admin)
exports.getAllFeeAdmins = async (req, res) => {
  try {
    const branchAdminId = req.userId;

    const branchAdmin = await Admin.findById(branchAdminId);
    if (!branchAdmin || !['branchAdmin', 'staffAdmin'].includes(branchAdmin.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const feeAdmins = await Admin.find({ 
      role: 'feeAdmin', 
      branch: branchAdmin.branch 
    }).select('-password');

    res.status(200).json({ feeAdmins });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete Fee Admin (by Branch Admin)
exports.deleteFeeAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const branchAdminId = req.userId;

    const branchAdmin = await Admin.findById(branchAdminId);
    if (!branchAdmin || !['branchAdmin', 'staffAdmin'].includes(branchAdmin.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const feeAdmin = await Admin.findById(id);
    if (!feeAdmin || feeAdmin.role !== 'feeAdmin') {
      return res.status(404).json({ message: 'Fee Admin not found' });
    }

    if (feeAdmin.branch.toString() !== branchAdmin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Admin.findByIdAndDelete(id);
    res.status(200).json({ message: 'Fee Admin deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
