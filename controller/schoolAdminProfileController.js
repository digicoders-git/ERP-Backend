const Admin = require('../model/Admin');
const Client = require('../model/Client');

// GET profile
exports.getProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.userId).select('-password').lean();
    if (!admin || admin.role !== 'clientAdmin')
      return res.status(403).json({ message: 'Access denied' });

    const client = await Client.findById(admin.client)
      .populate('plan', 'planName planType panelsIncluded maxBranches')
      .lean();

    res.status(200).json({
      success: true,
      data: {
        admin: { 
          id: admin._id, 
          email: admin.email, 
          name: admin.name,
          mobile: admin.mobile,
          address: admin.address,
          profileImage: admin.profileImage,
          role: admin.role, 
          allowedPanels: admin.allowedPanels, 
          status: admin.status, 
          createdAt: admin.createdAt 
        },
        school: client || null
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// UPDATE profile (email only)
exports.updateProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.userId);
    if (!admin || admin.role !== 'clientAdmin')
      return res.status(403).json({ message: 'Access denied' });

    const { email, name, mobile, address } = req.body;
    if (email && email !== admin.email) {
      const exists = await Admin.findOne({ email });
      if (exists) return res.status(400).json({ message: 'Email already in use' });
      admin.email = email;
    }

    if (name !== undefined) admin.name = name;
    if (mobile !== undefined) admin.mobile = mobile;
    if (address !== undefined) admin.address = address;

    if (req.cloudinaryUrl) {
      admin.profileImage = req.cloudinaryUrl;
    } else if (req.file) {
      admin.profileImage = req.file.path;
    }

    await admin.save();
    res.status(200).json({ 
      success: true, 
      message: 'Profile updated successfully', 
      data: { 
        email: admin.email,
        name: admin.name,
        mobile: admin.mobile,
        address: admin.address
      } 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// CHANGE PASSWORD
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: 'currentPassword and newPassword are required' });
    if (newPassword.length < 6)
      return res.status(400).json({ message: 'New password must be at least 6 characters' });

    const admin = await Admin.findById(req.userId);
    if (!admin || admin.role !== 'clientAdmin')
      return res.status(403).json({ message: 'Access denied' });

    const isMatch = await admin.comparePassword(currentPassword);
    if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });

    if (currentPassword === newPassword)
      return res.status(400).json({ message: 'New password must be different from current password' });

    admin.password = newPassword;
    await admin.save();
    res.status(200).json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
