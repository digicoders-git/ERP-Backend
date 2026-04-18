const Admin = require('../../model/Admin');
const Staff = require('../../model/Staff');
const bcrypt = require('bcryptjs');

const getBranchClient = async (userId) => {
  let user = await Admin.findById(userId).select('branch client').lean();
  if (!user) {
    user = await Staff.findById(userId).select('branch client').lean();
  }
  if (!user) {
    throw new Error('User not found or unauthorized');
  }
  return user;
};

// Get all fee admins
exports.getAllFeeAdmins = async (req, res) => {
  try {
    const { branch } = await getBranchClient(req.userId);
    
    const feeAdmins = await Admin.find({
      branch,
      role: 'feeAdmin'
    })
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ feeAdmins });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create fee admin
exports.createFeeAdmin = async (req, res) => {
  try {
    const { branch, client } = await getBranchClient(req.userId);
    const { name, email, mobile, password, employeeId, status } = req.body;

    // Check if email already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const feeAdmin = new Admin({
      email,
      password,
      role: 'feeAdmin',
      name,
      mobile,
      employeeId,
      status: status || 'active',
      branch,
      client,
      allowedPanels: ['fee'],
      createdBy: req.userId
    });

    await feeAdmin.save();

    res.status(201).json({
      message: 'Fee Admin created successfully',
      feeAdmin: {
        _id: feeAdmin._id,
        name: feeAdmin.name,
        email: feeAdmin.email,
        mobile: feeAdmin.mobile,
        employeeId: feeAdmin.employeeId,
        status: feeAdmin.status
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update fee admin
exports.updateFeeAdmin = async (req, res) => {
  try {
    const { branch } = await getBranchClient(req.userId);
    const { name, email, mobile, password, employeeId, status } = req.body;

    const feeAdmin = await Admin.findOne({
      _id: req.params.id,
      branch,
      role: 'feeAdmin'
    });

    if (!feeAdmin) {
      return res.status(404).json({ message: 'Fee Admin not found' });
    }

    // Check if email is being changed and if it already exists
    if (email && email !== feeAdmin.email) {
      const existingAdmin = await Admin.findOne({ email });
      if (existingAdmin) {
        return res.status(400).json({ message: 'Email already exists' });
      }
      feeAdmin.email = email;
    }

    if (name) feeAdmin.name = name;
    if (mobile) feeAdmin.mobile = mobile;
    if (employeeId) feeAdmin.employeeId = employeeId;
    if (status) feeAdmin.status = status;
    if (password) feeAdmin.password = password;

    await feeAdmin.save();

    res.status(200).json({
      message: 'Fee Admin updated successfully',
      feeAdmin: {
        _id: feeAdmin._id,
        name: feeAdmin.name,
        email: feeAdmin.email,
        mobile: feeAdmin.mobile,
        employeeId: feeAdmin.employeeId,
        status: feeAdmin.status
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete fee admin
exports.deleteFeeAdmin = async (req, res) => {
  try {
    const { branch } = await getBranchClient(req.userId);

    const feeAdmin = await Admin.findOneAndDelete({
      _id: req.params.id,
      branch,
      role: 'feeAdmin'
    });

    if (!feeAdmin) {
      return res.status(404).json({ message: 'Fee Admin not found' });
    }

    res.status(200).json({ message: 'Fee Admin deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
