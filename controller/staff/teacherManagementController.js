const Teacher = require('../../model/Teacher');
const Admin = require('../../model/Admin');
const Staff = require('../../model/Staff');
const { successResponse, errorResponse } = require('../../responseFormatter');
const path = require('path');
const fs = require('fs');
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

exports.getAllTeachers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const { branch } = await getBranchClient(req.userId);
    const skip = (page - 1) * limit;

    const query = { 
      branch 
    };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { subjects: { $regex: search, $options: 'i' } }
      ];
    }

    const [teachers, total] = await Promise.all([
      Teacher.find(query)
        .populate('branch', 'branchName')
        .populate('client', 'clientName')
        .populate('assignedClass', 'className')
        .populate('assignedSection', 'sectionName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Teacher.countDocuments(query)
    ]);

    return successResponse(res, {
      teachers,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    }, 'Teachers fetched successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.getTeacherById = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id)
      .populate('branch', 'branchName')
      .populate('client', 'clientName')
      .populate('assignedClass', 'className')
      .populate('assignedSection', 'sectionName');
    if (!teacher) {
      return errorResponse(res, 'Teacher not found', 404);
    }
    return successResponse(res, teacher, 'Teacher fetched successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.createTeacher = async (req, res) => {
  try {
    const { name, email, mobile, password, subjects, qualification, experience, salary, address, branch, client, createdBy, status, assignedClass, assignedSection } = req.body;

    if (!name || !email || !mobile || (!password && !req.params.id)) {
      return errorResponse(res, 'Name, email, mobile, and password are required', 400);
    }

    // Check if email already exists in Admin
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return errorResponse(res, 'Email already exists in Admin', 400);
    }

    const existingTeacher = await Teacher.findOne({ email });
    if (existingTeacher) {
      return errorResponse(res, 'Email already exists in Teacher', 400);
    }

    const admin = await getBranchClient(req.userId);
    if (!admin) return errorResponse(res, 'Admin not found', 404);

    const teacher = new Teacher({
      name,
      email,
      mobile,
      profileImage: req.file ? (req.file.cloudinaryUrl || `/uploads/teacher/profile/${req.file.filename}`) : null,
      subjects: subjects || [],
      qualification: qualification || '',
      experience: experience || '',
      salary: salary || 0,
      address: address || '',
      branch: admin.branch,
      client: admin.client,
      createdBy: req.userId,
      status: status !== undefined ? status : true,
      assignedClass: assignedClass || null,
      assignedSection: assignedSection || null
    });

    await teacher.save();

    // Create Teacher Admin
    const teacherAdmin = new Admin({
      email,
      password,
      role: 'teacherAdmin',
      client: admin.client,
      branch: admin.branch,
      teacher: teacher._id,
      allowedPanels: [],
      status: true
    });
    await teacherAdmin.save();

    await teacher.populate('branch', 'branchName');
    await teacher.populate('client', 'clientName');
    await teacher.populate('assignedClass', 'className');
    await teacher.populate('assignedSection', 'sectionName');
    
    return successResponse(res, teacher, 'Teacher created successfully', 201);
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.updateTeacher = async (req, res) => {
  try {
    const { name, email, mobile, password, subjects, qualification, experience, salary, address, status } = req.body;
    const teacher = await Teacher.findById(req.params.id);

    if (!teacher) {
      return errorResponse(res, 'Teacher not found', 404);
    }

    if (email && email !== teacher.email) {
      // Check if email already exists in Admin
      const existingAdminEmail = await Admin.findOne({ email });
      if (existingAdminEmail) {
        return errorResponse(res, 'Email already exists in Admin', 400);
      }
      const existingEmail = await Teacher.findOne({ email });
      if (existingEmail) {
        return errorResponse(res, 'Email already exists in Teacher', 400);
      }
      teacher.email = email;
    }

    if (name) teacher.name = name;
    if (mobile) teacher.mobile = mobile;
    if (subjects) teacher.subjects = subjects;
    if (qualification) teacher.qualification = qualification;
    if (experience) teacher.experience = experience;
    if (salary !== undefined) teacher.salary = salary;
    if (address) teacher.address = address;
    if (status !== undefined) teacher.status = status;

    // Handle profile image update
    if (req.file) {
      // Delete old photo if it's local
      if (teacher.profileImage && !teacher.profileImage.startsWith('http')) {
        const oldPath = path.join(__dirname, '../../', teacher.profileImage.replace(/^\//, ''));
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      teacher.profileImage = req.file.cloudinaryUrl || `/uploads/teacher/profile/${req.file.filename}`;
    }

    await teacher.save();

    // Update teacher admin password if provided
    if (password) {
      const teacherAdmin = await Admin.findOne({ teacher: req.params.id, role: 'teacherAdmin' });
      if (teacherAdmin) {
        teacherAdmin.password = password;
        await teacherAdmin.save();
      }
    }

    await teacher.populate('branch', 'branchName');
    await teacher.populate('client', 'clientName');
    
    return successResponse(res, teacher, 'Teacher updated successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.deleteTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndDelete(req.params.id);
    if (!teacher) {
      return errorResponse(res, 'Teacher not found', 404);
    }
    return successResponse(res, null, 'Teacher deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.searchTeachers = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return errorResponse(res, 'Search query is required', 400);
    }

    const teachers = await Teacher.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { subjects: { $regex: query, $options: 'i' } }
      ]
    })
    .populate('branch', 'branchName')
    .populate('client', 'clientName');

    return successResponse(res, teachers, 'Search results');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.getTeachersByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const statusBool = status === 'Active' ? true : false;

    const teachers = await Teacher.find({ status: statusBool })
      .populate('branch', 'branchName')
      .populate('client', 'clientName');
    
    return successResponse(res, teachers, `${status} teachers fetched`);
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.getTeachersBySubject = async (req, res) => {
  try {
    const { subject } = req.params;
    const teachers = await Teacher.find({ subjects: subject })
      .populate('branch', 'branchName')
      .populate('client', 'clientName');
    
    return successResponse(res, teachers, 'Teachers fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.getTeachersByBranch = async (req, res) => {
  try {
    const { branchId } = req.params;
    const teachers = await Teacher.find({ branch: branchId })
      .populate('branch', 'branchName')
      .populate('client', 'clientName');
    
    return successResponse(res, teachers, 'Teachers fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};
