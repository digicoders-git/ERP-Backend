const Teacher = require('../../model/Teacher');
const { successResponse, errorResponse } = require('../../responseFormatter');

exports.getAllTeachers = async (req, res) => {
  try {
    const teachers = await Teacher.find()
      .populate('branch', 'branchName')
      .populate('client', 'clientName')
      .sort({ createdAt: -1 });
    return successResponse(res, teachers, 'Teachers fetched successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.getTeacherById = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id)
      .populate('branch', 'branchName')
      .populate('client', 'clientName');
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
    const { name, email, mobile, subjects, qualification, experience, salary, address, branch, client, createdBy, status } = req.body;

    if (!name || !email || !mobile || !branch || !client || !createdBy) {
      return errorResponse(res, 'All required fields must be provided', 400);
    }

    const existingTeacher = await Teacher.findOne({ email });
    if (existingTeacher) {
      return errorResponse(res, 'Email already exists', 400);
    }

    const teacher = new Teacher({
      name,
      email,
      mobile,
      subjects: subjects || [],
      qualification: qualification || '',
      experience: experience || '',
      salary: salary || 0,
      address: address || '',
      branch,
      client,
      createdBy,
      status: status !== undefined ? status : true
    });

    await teacher.save();
    await teacher.populate('branch', 'branchName');
    await teacher.populate('client', 'clientName');
    
    return successResponse(res, teacher, 'Teacher created successfully', 201);
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.updateTeacher = async (req, res) => {
  try {
    const { name, email, mobile, subjects, qualification, experience, salary, address, status } = req.body;
    const teacher = await Teacher.findById(req.params.id);

    if (!teacher) {
      return errorResponse(res, 'Teacher not found', 404);
    }

    if (email && email !== teacher.email) {
      const existingEmail = await Teacher.findOne({ email });
      if (existingEmail) {
        return errorResponse(res, 'Email already exists', 400);
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

    await teacher.save();
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
