const Admin = require('../../model/Admin');
const Teacher = require('../../model/Teacher');

const getTeacherAdmin = async (userId) => {
  const admin = await Admin.findById(userId).lean();
  if (!admin || admin.role !== 'teacherAdmin') return null;
  return admin;
};

// GET profile
exports.getProfile = async (req, res) => {
  try {
    console.log('Getting profile for userId:', req.userId);
    const admin = await Admin.findById(req.userId).lean();
    console.log('Admin found:', admin);
    
    if (!admin || admin.role !== 'teacherAdmin') {
      console.log('Access denied - not a teacherAdmin');
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const teacher = await Teacher.findById(admin.teacher)
      .populate('branch', 'branchName branchCode address')
      .populate('assignedClass', 'className')
      .populate('assignedSection', 'sectionName')
      .lean();

    console.log('Teacher found:', teacher);
    
    if (!teacher) {
      console.log('Teacher not found');
      return res.status(404).json({ success: false, message: 'Teacher profile not found' });
    }

    res.status(200).json({
      success: true,
      data: teacher
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// UPDATE profile
exports.updateProfile = async (req, res) => {
  try {
    const admin = await getTeacherAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Access denied' });

    const { name, mobile, qualification, experience, address } = req.body;
    const updateData = {};
    if (name) updateData.name = name;
    if (mobile) updateData.mobile = mobile;
    if (qualification) updateData.qualification = qualification;
    if (experience !== undefined) updateData.experience = experience;
    if (address) updateData.address = address;

    const teacher = await Teacher.findByIdAndUpdate(admin.teacher, updateData, { new: true })
      .populate('branch', 'branchName branchCode address')
      .populate('assignedClass', 'className')
      .populate('assignedSection', 'sectionName')
      .select('-createdBy')
      .lean();

    if (!teacher) return res.status(404).json({ message: 'Teacher profile not found' });

    res.status(200).json({ success: true, message: 'Profile updated successfully', data: teacher });
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
    if (!admin || admin.role !== 'teacherAdmin')
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
