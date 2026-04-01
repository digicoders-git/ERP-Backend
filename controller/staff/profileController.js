const Admin = require('../../model/Admin');
const Staff = require('../../model/Staff');
const bcrypt = require('bcryptjs');

const getAdminWithStaff = async (userId) => {
  return Admin.findById(userId).populate('staff').lean();
};

// GET profile
exports.getProfile = async (req, res) => {
  try {
    const admin = await getAdminWithStaff(req.userId);
    if (!admin) return res.status(404).json({ message: 'Admin not found' });

    const staff = admin.staff
      ? await Staff.findById(admin.staff).populate('branch', 'branchName branchCode').lean()
      : null;

    res.status(200).json({ admin: { email: admin.email, role: admin.role }, staff });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// UPDATE profile
exports.updateProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.userId).lean();
    if (!admin || !admin.staff) return res.status(404).json({ message: 'Staff profile not found' });

    const { name, mobile, qualification, experience, address } = req.body;
    const updateData = {};
    if (name) updateData.name = name;
    if (mobile) updateData.mobile = mobile;
    if (qualification) updateData.qualification = qualification;
    if (experience) updateData.experience = experience;
    if (address) updateData.address = address;
    if (req.file) updateData.profileImage = req.file.path;

    const staff = await Staff.findByIdAndUpdate(admin.staff, updateData, { new: true })
      .populate('branch', 'branchName branchCode')
      .lean();

    res.status(200).json({ message: 'Profile updated successfully', staff });
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
    if (!admin) return res.status(404).json({ message: 'Admin not found' });

    const isMatch = await admin.comparePassword(currentPassword);
    if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });

    admin.password = newPassword;
    await admin.save();

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
