const Teacher = require('../model/Teacher');
const Admin = require('../model/Admin');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { generateRandomId } = require('../utils/idGenerator');

// Teacher Login
exports.teacherLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Email and password are required' 
      });
    }

    const teacherAdmin = await Admin.findOne({ 
      email, 
      role: 'teacherAdmin' 
    }).populate('teacher').populate('branch', 'branchName branchCode');

    if (!teacherAdmin) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password' 
      });
    }

    if (!teacherAdmin.status) {
      return res.status(403).json({ 
        success: false,
        message: 'Your account has been deactivated. Please contact administrator.' 
      });
    }

    const isPasswordValid = await teacherAdmin.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password' 
      });
    }

    const teacher = await Teacher.findById(teacherAdmin.teacher)
      .populate('branch', 'branchName branchCode address')
      .populate('assignedClass', 'className')
      .populate('assignedSection', 'sectionName')
      .lean();

    if (!teacher) {
      return res.status(404).json({ 
        success: false,
        message: 'Teacher profile not found' 
      });
    }

    if (!teacher.status) {
      return res.status(403).json({ 
        success: false,
        message: 'Your account has been deactivated. Please contact administrator.' 
      });
    }

    const token = jwt.sign(
      { 
        _id: teacherAdmin._id,
        email: teacherAdmin.email,
        role: teacherAdmin.role,
        teacher: teacher._id,
        branch: teacherAdmin.branch,
        client: teacherAdmin.client
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      teacher: {
        id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        mobile: teacher.mobile,
        profileImage: teacher.profileImage,
        subjects: teacher.subjects,
        qualification: teacher.qualification,
        experience: teacher.experience,
        salary: teacher.salary,
        address: teacher.address,
        assignedClass: teacher.assignedClass,
        assignedSection: teacher.assignedSection,
        branch: teacher.branch,
        status: teacher.status
      }
    });
  } catch (error) {
    console.error('Teacher login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during login',
      error: error.message 
    });
  }
};

// Get Teacher Profile
exports.getTeacherProfile = async (req, res) => {
  try {
    const teacherId = req.user.teacher;

    const teacher = await Teacher.findById(teacherId)
      .populate('branch', 'branchName branchCode address')
      .populate('client', 'name')
      .lean();

    if (!teacher) {
      return res.status(404).json({ 
        success: false,
        message: 'Teacher profile not found' 
      });
    }

    res.status(200).json({
      success: true,
      data: teacher
    });
  } catch (error) {
    console.error('Get teacher profile error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
};

// Update Teacher Profile
exports.updateTeacherProfile = async (req, res) => {
  try {
    const teacherId = req.user.teacher;
    const { mobile, address, qualification, experience } = req.body;

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ 
        success: false,
        message: 'Teacher not found' 
      });
    }

    if (mobile) teacher.mobile = mobile;
    if (address !== undefined) teacher.address = address;
    if (qualification !== undefined) teacher.qualification = qualification;
    if (experience !== undefined) teacher.experience = experience;

    if (req.file) {
      teacher.profileImage = req.file.cloudinaryUrl || `/uploads/teacher/${req.file.filename}`;
    }

    await teacher.save();

    res.status(200).json({ 
      success: true,
      message: 'Profile updated successfully', 
      data: teacher 
    });
  } catch (error) {
    console.error('Update teacher profile error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
};

// Change Password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false,
        message: 'Current password and new password are required' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false,
        message: 'New password must be at least 6 characters long' 
      });
    }

    const teacherAdmin = await Admin.findById(req.user._id);
    if (!teacherAdmin) {
      return res.status(404).json({ 
        success: false,
        message: 'Admin account not found' 
      });
    }

    const isPasswordValid = await teacherAdmin.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false,
        message: 'Current password is incorrect' 
      });
    }

    teacherAdmin.password = newPassword;
    await teacherAdmin.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
};

// Create Teacher
exports.createTeacher = async (req, res) => {
  try {
    const { name, email, mobile, password, subjects, qualification, experience, salary, address, assignedClass, assignedSection } = req.body;
    console.log(`Creating teacher ${name} with email ${email}`);

    if (!name || !email || !mobile || !password) {
      return res.status(400).json({ message: 'Name, email, mobile, and password are required' });
    }

    const branchAdmin = await Admin.findById(req.userId).populate('branch');
    if (!branchAdmin || branchAdmin.role !== 'branchAdmin') {
      return res.status(403).json({ message: 'Only branch admin can create teachers' });
    }

    // Check if email already exists in Admin (only active teacherAdmin)
    const existingAdmin = await Admin.findOne({ email, role: 'teacherAdmin', status: true });
    if (existingAdmin) {
      console.log(`Email ${email} already exists in active Admin`);
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Delete any inactive/deleted admins with this email
    await Admin.deleteMany({ email, role: 'teacherAdmin', status: false });

    // Check if email already exists in Teacher
    const existingTeacher = await Teacher.findOne({ email });
    if (existingTeacher) {
      console.log(`Email ${email} already exists in Teacher`);
      return res.status(400).json({ message: 'Email already exists' });
    }

    let profileImagePath = null;
    if (req.file) {
      profileImagePath = req.file.cloudinaryUrl || `/uploads/teacher/profile/${req.file.filename}`;
    }

    let subjectsArray = [];
    if (subjects) {
      subjectsArray = typeof subjects === 'string' ? JSON.parse(subjects) : subjects;
    }

    const teacher = new Teacher({
      customId: generateRandomId(),
      name,
      email,
      mobile,
      profileImage: profileImagePath,
      subjects: subjectsArray,
      qualification,
      experience,
      salary,
      address,
      branch: branchAdmin.branch._id,
      client: branchAdmin.client,
      createdBy: req.userId,
      status: true,
      assignedClass: assignedClass || null,
      assignedSection: assignedSection || null
    });
    await teacher.save();

    const teacherAdmin = new Admin({
      email,
      password,
      role: 'teacherAdmin',
      client: branchAdmin.client,
      branch: branchAdmin.branch._id,
      teacher: teacher._id,
      allowedPanels: [],
      status: true
    });
    await teacherAdmin.save();

    res.status(201).json({
      message: 'Teacher and Teacher Admin created successfully',
      teacher: {
        id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        mobile: teacher.mobile,
        profileImage: teacher.profileImage,
        subjects: teacher.subjects,
        qualification: teacher.qualification,
        experience: teacher.experience,
        salary: teacher.salary,
        address: teacher.address,
        status: teacher.status
      },
      admin: {
        id: teacherAdmin._id,
        email: teacherAdmin.email,
        role: teacherAdmin.role
      }
    });
  } catch (error) {
    if (req.file) {
      const filePath = path.join(__dirname, '..', 'uploads', 'teacher', req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Teachers
exports.getAllTeachers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const skip = (page - 1) * limit;
    const admin = await Admin.findById(req.userId);

    const searchQuery = search ? {
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
        { qualification: { $regex: search, $options: 'i' } },
        { subjects: { $regex: search, $options: 'i' } }
      ]
    } : {};

    if (admin.role === 'branchAdmin') {
      searchQuery.branch = admin.branch;
      const teachers = await Teacher.find(searchQuery)
        .populate('createdBy', 'email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Teacher.countDocuments(searchQuery);
      return res.status(200).json({ 
        teachers, 
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit)
        }
      });
    }

    if (admin.role === 'clientAdmin') {
      searchQuery.client = admin.client;
      const teachers = await Teacher.find(searchQuery)
        .populate('branch', 'branchName branchCode')
        .populate('createdBy', 'email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Teacher.countDocuments(searchQuery);
      return res.status(200).json({ 
        teachers, 
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit)
        }
      });
    }

    if (admin.role === 'superAdmin') {
      const teachers = await Teacher.find(searchQuery)
        .populate('branch', 'branchName branchCode')
        .populate('client', 'name')
        .populate('createdBy', 'email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Teacher.countDocuments(searchQuery);
      return res.status(200).json({ 
        teachers, 
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit)
        }
      });
    }

    return res.status(403).json({ message: 'Access denied' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Single Teacher
exports.getTeacherById = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const admin = await Admin.findById(req.userId);

    const teacher = await Teacher.findById(teacherId)
      .populate('branch', 'branchName branchCode address')
      .populate('client', 'name')
      .populate('createdBy', 'email')
      .populate('assignedClass', 'className classCode stream')
      .populate('assignedSection', 'sectionName');

    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    if (admin.role === 'branchAdmin' && teacher.branch._id.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (admin.role === 'clientAdmin' && teacher.client._id.toString() !== admin.client.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (admin.role === 'teacherAdmin' && teacher._id.toString() !== admin.teacher.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const teacherAdmin = await Admin.findOne({ teacher: teacherId, role: 'teacherAdmin' }).select('-password');

    res.status(200).json({ teacher, admin: teacherAdmin });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Teacher
exports.updateTeacher = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { name, mobile, subjects, qualification, experience, salary, address, password, assignedClass, assignedSection } = req.body;

    const admin = await Admin.findById(req.userId);
    if (admin.role !== 'branchAdmin' && admin.role !== 'superAdmin') {
      return res.status(403).json({ message: 'Only branch admin or super admin can update teachers' });
    }

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    if (admin.role === 'branchAdmin' && teacher.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (name) teacher.name = name;
    if (mobile) teacher.mobile = mobile;
    if (subjects) {
      teacher.subjects = typeof subjects === 'string' ? JSON.parse(subjects) : subjects;
    }
    if (qualification !== undefined) teacher.qualification = qualification;
    if (experience !== undefined) teacher.experience = experience;
    if (salary !== undefined) teacher.salary = salary;
    if (address !== undefined) teacher.address = address;
    if (assignedClass !== undefined) teacher.assignedClass = assignedClass || null;
    if (assignedSection !== undefined) teacher.assignedSection = assignedSection || null;

    if (req.file) {
      if (teacher.profileImage && !teacher.profileImage.startsWith('http')) {
        const oldPath = path.join(__dirname, '..', teacher.profileImage.replace(/^\//, ''));
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      teacher.profileImage = req.file.cloudinaryUrl || `/uploads/teacher/profile/${req.file.filename}`;
    }

    await teacher.save();

    if (password) {
      const teacherAdmin = await Admin.findOne({ teacher: teacherId, role: 'teacherAdmin' });
      if (teacherAdmin) {
        teacherAdmin.password = password;
        await teacherAdmin.save();
      }
    }

    res.status(200).json({ message: 'Teacher updated successfully', teacher });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete Teacher (PERMANENT DELETE)
exports.deleteTeacher = async (req, res) => {
  try {
    const { teacherId } = req.params;

    const admin = await Admin.findById(req.userId);
    if (admin.role !== 'branchAdmin' && admin.role !== 'superAdmin') {
      return res.status(403).json({ message: 'Only branch admin or super admin can delete teachers' });
    }

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    if (admin.role === 'branchAdmin' && teacher.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Delete profile image if exists
    if (teacher.profileImage && !teacher.profileImage.startsWith('http')) {
      const imagePath = path.join(__dirname, '..', teacher.profileImage.replace(/^\//, ''));
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Delete teacher admin
    await Admin.deleteOne({ teacher: teacherId, role: 'teacherAdmin' });

    // Delete teacher permanently
    await Teacher.findByIdAndDelete(teacherId);

    res.status(200).json({ message: 'Teacher deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Toggle Teacher Status
exports.toggleTeacherStatus = async (req, res) => {
  try {
    const { teacherId } = req.params;

    const admin = await Admin.findById(req.userId);
    if (admin.role !== 'branchAdmin' && admin.role !== 'superAdmin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    if (admin.role === 'branchAdmin' && teacher.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    teacher.status = !teacher.status;
    await teacher.save();

    await Admin.updateOne(
      { teacher: teacherId, role: 'teacherAdmin' },
      { status: teacher.status }
    );

    res.status(200).json({ message: 'Teacher status updated successfully', status: teacher.status });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
