const Admin = require('../../model/Admin');
const Staff = require('../../model/Staff');
const Student = require('../../model/Student');
const Teacher = require('../../model/Teacher');
const Class = require('../../model/Class');
const bcrypt = require('bcryptjs');

const getAdminWithStaff = async (userId) => {
  return Admin.findById(userId).populate('staff').lean();
};

// GET profile
exports.getProfile = async (req, res) => {
  try {
    let admin = await Admin.findById(req.userId).lean();
    let staff = null;

    if (admin) {
      staff = admin.staff
        ? await Staff.findById(admin.staff).populate('branch', 'branchName branchCode').lean()
        : null;
    } else {
      // If no admin found, maybe the user is a normal Staff
      staff = await Staff.findById(req.userId).populate('branch', 'branchName branchCode').lean();
    }

    if (!staff && !admin) return res.status(404).json({ message: 'Profile not found' });

    // Fetch real-time stats for the branch if staff exists
    let studentCount = 0, staffCount = 0, classCount = 0;
    let serviceYears = 1;

    if (staff && staff.branch) {
      [studentCount, staffCount, classCount] = await Promise.all([
        Student.countDocuments({ branch: staff.branch._id, status: 'active' }),
        Staff.countDocuments({ branch: staff.branch._id, status: true }),
        Class.countDocuments({ branch: staff.branch._id })
      ]);

      const joinDate = new Date(staff.createdAt);
      const now = new Date();
      serviceYears = now.getFullYear() - joinDate.getFullYear();
    }

    const stats = {
      classesAssigned: classCount, 
      students: studentCount,
      yearsOfService: serviceYears || 1
    };

    res.status(200).json({ 
      admin: admin ? { email: admin.email, role: admin.role, name: admin.name, mobile: admin.mobile, profileImage: admin.profileImage } : null, 
      staff,
      stats 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// UPDATE profile
exports.updateProfile = async (req, res) => {
  try {
    let adminDoc = await Admin.findById(req.userId);
    let staffDoc = null;

    if (adminDoc && adminDoc.staff) {
      staffDoc = await Staff.findById(adminDoc.staff);
    } else {
      staffDoc = await Staff.findById(req.userId);
    }

    if (!staffDoc && !adminDoc) return res.status(404).json({ message: 'Profile not found' });

    const { name, mobile, designation, department, gender, qualification, experience, address } = req.body;
    
    // Fields to update in Staff model
    const staffUpdateData = {};
    if (name !== undefined) staffUpdateData.name = name;
    if (mobile !== undefined) staffUpdateData.mobile = mobile;
    if (designation !== undefined) staffUpdateData.designation = designation;
    if (department !== undefined) staffUpdateData.department = department;
    if (gender !== undefined) staffUpdateData.gender = gender;
    if (qualification !== undefined) staffUpdateData.qualification = qualification;
    if (experience !== undefined) staffUpdateData.experience = experience;
    if (address !== undefined) staffUpdateData.address = address;

    if (req.cloudinaryUrl) {
      staffUpdateData.profileImage = req.cloudinaryUrl;
    } else if (req.file) {
      staffUpdateData.profileImage = req.file.path;
    }

    let staff = null;
    if (staffDoc) {
      staff = await Staff.findByIdAndUpdate(staffDoc._id, staffUpdateData, { new: true })
        .populate('branch', 'branchName branchCode')
        .lean();
    }

    // Sync with Admin model
    if (adminDoc) {
      if (name !== undefined) adminDoc.name = name;
      if (mobile !== undefined) adminDoc.mobile = mobile;
      if (address !== undefined) adminDoc.address = address;
      if (staffUpdateData.profileImage) adminDoc.profileImage = staffUpdateData.profileImage;
      await adminDoc.save();
    }

    res.status(200).json({ 
      message: 'Profile updated successfully', 
      staff,
      admin: adminDoc ? { email: adminDoc.email, role: adminDoc.role, name: adminDoc.name, mobile: adminDoc.mobile, profileImage: adminDoc.profileImage } : null
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// CHANGE PASSWORD (remains mostly same but improved)
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: 'currentPassword and newPassword are required' });

    if (newPassword.length < 6)
      return res.status(400).json({ message: 'New password must be at least 6 characters' });

    let user = await Admin.findById(req.userId);
    let isStaff = false;

    if (!user) {
      user = await Staff.findById(req.userId);
      isStaff = true;
    }

    if (!user) return res.status(404).json({ message: 'User not found' });

    let isMatch = false;
    if (isStaff) {
      isMatch = (user.password === currentPassword);
    } else {
      isMatch = await user.comparePassword(currentPassword);
    }

    if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });

    user.password = newPassword;
    await user.save();

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
