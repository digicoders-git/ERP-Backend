const Admin = require('../model/Admin');
const Branch = require('../model/Branch');

const getBranchAdmin = async (userId) => {
  const admin = await Admin.findById(userId).lean();
  if (!admin || admin.role !== 'branchAdmin') return null;
  return admin;
};

// GET profile (branch info + admin email)
exports.getBranchProfile = async (req, res) => {
  try {
    const admin = await getBranchAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Only branch admin can access this' });

    const branch = await Branch.findById(admin.branch)
      .populate('client', 'name phone')
      .lean();

    if (!branch) return res.status(404).json({ message: 'Branch not found' });

    // Fetch real-time stats from database
    const Student = require('../model/Student');
    const Teacher = require('../model/Teacher');
    const Class = require('../model/Class');

    const [studentCount, teacherCount, classCount] = await Promise.all([
      Student.countDocuments({ branch: admin.branch, status: 'active' }),
      Teacher.countDocuments({ branch: admin.branch, status: true }),
      Class.countDocuments({ branch: admin.branch })
    ]);

    // Update branch with real stats
    branch.students = studentCount;
    branch.teachers = teacherCount;
    branch.classes = classCount;

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
          status: admin.status,
          allowedPanels: admin.allowedPanels,
          createdAt: admin.createdAt
        },
        branch
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// UPDATE profile (admin + branch fields)
exports.updateProfile = async (req, res) => {
  try {
    const adminDoc = await Admin.findById(req.userId);
    if (!adminDoc || adminDoc.role !== 'branchAdmin')
      return res.status(403).json({ message: 'Only branch admin can access this' });

    const { name, mobile, address, principalName, phone, location } = req.body;

    // Update admin-level fields
    if (name !== undefined) adminDoc.name = name;
    if (mobile !== undefined) adminDoc.mobile = mobile;
    if (address !== undefined) adminDoc.address = address;
    
    if (req.cloudinaryUrl) {
      adminDoc.profileImage = req.cloudinaryUrl;
    } else if (req.file) {
      adminDoc.profileImage = req.file.path;
    }

    await adminDoc.save();

    // Update branch-level fields
    const branchUpdate = {};
    if (principalName !== undefined) branchUpdate.principalName = principalName;
    if (phone !== undefined) branchUpdate.phone = phone;
    if (location !== undefined) branchUpdate.location = location;

    const branch = await Branch.findByIdAndUpdate(adminDoc.branch, branchUpdate, { new: true })
      .populate('client', 'name phone')
      .lean();

    const updatedAdmin = await Admin.findById(req.userId).select('-password').lean();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        admin: {
          id: updatedAdmin._id,
          email: updatedAdmin.email,
          name: updatedAdmin.name,
          mobile: updatedAdmin.mobile,
          address: updatedAdmin.address,
          profileImage: updatedAdmin.profileImage,
          role: updatedAdmin.role,
          status: updatedAdmin.status,
          allowedPanels: updatedAdmin.allowedPanels,
          createdAt: updatedAdmin.createdAt
        },
        branch
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
    if (!admin || admin.role !== 'branchAdmin')
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
