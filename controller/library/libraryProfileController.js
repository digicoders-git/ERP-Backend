const Admin = require('../../model/Admin');
const Librarian = require('../../model/Librarian');

// GET profile
exports.getProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.userId).select('-password').lean();
    if (!admin || admin.role !== 'libraryAdmin')
      return res.status(403).json({ message: 'Access denied' });

    const librarian = await Librarian.findOne({ branch: admin.branch })
      .populate('branch', 'branchName branchCode')
      .lean();

    res.status(200).json({
      success: true,
      data: {
        admin: { id: admin._id, email: admin.email, role: admin.role, status: admin.status },
        librarian: librarian ? {
          ...librarian,
          librarianId: librarian.staffId
        } : null
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// UPDATE profile
exports.updateProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.userId).lean();
    if (!admin || admin.role !== 'libraryAdmin')
      return res.status(403).json({ message: 'Access denied' });

    const { name, phone, qualification } = req.body;
    const updateData = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (qualification) updateData.qualification = qualification;

    const librarian = await Librarian.findOneAndUpdate(
      { branch: admin.branch },
      updateData,
      { new: true }
    ).populate('branch', 'branchName branchCode').lean();

    res.status(200).json({ success: true, message: 'Profile updated successfully', data: librarian });
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
    if (!admin || admin.role !== 'libraryAdmin')
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
