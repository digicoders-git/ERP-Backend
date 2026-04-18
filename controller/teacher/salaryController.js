const Salary = require('../../model/Salary');
const Teacher = require('../../model/Teacher');
const Admin = require('../../model/Admin');
const { successResponse, errorResponse } = require('../../responseFormatter');

exports.getTeacherSalaries = async (req, res) => {
  try {
    const adminId = req.userId;
    const { month, status } = req.query;

    console.log('Getting teacher salaries for adminId:', adminId);

    // Get admin details to find teacher
    const admin = await Admin.findById(adminId).select('teacher').lean();
    if (!admin) {
      console.log('Admin not found:', adminId);
      return errorResponse(res, 'Admin not found', 404);
    }

    if (!admin.teacher) {
      console.log('Teacher not linked to admin:', adminId);
      return errorResponse(res, 'Teacher not linked to your account', 404);
    }

    // Get teacher details
    const teacher = await Teacher.findById(admin.teacher).select('name').lean();
    if (!teacher) {
      console.log('Teacher not found:', admin.teacher);
      return errorResponse(res, 'Teacher not found', 404);
    }

    console.log('Fetching salaries for teacher:', teacher.name, 'ID:', admin.teacher);

    // Build query - use teacher ID instead of name for accuracy
    let query = { teacher: admin.teacher };
    
    if (month) {
      query.month = month;
    }
    
    if (status) {
      query.status = status;
    }

    // Fetch salaries with teacher details
    let salaries = await Salary.find(query)
      .sort({ month: -1 })
      .lean();

    // Manually populate teacher data
    salaries = await Promise.all(salaries.map(async (salary) => {
      if (salary.teacher) {
        try {
          const teacherData = await Teacher.findById(salary.teacher).select('name email profileImage').lean();
          salary.teacher = teacherData;
        } catch (err) {
          console.error('Error fetching teacher:', err);
        }
      }
      return salary;
    }));

    console.log('Found salaries:', salaries.length);

    // Calculate stats
    const stats = {
      totalRecords: salaries.length,
      paidCount: salaries.filter(s => s.status === 'Paid').length,
      pendingCount: salaries.filter(s => s.status === 'Pending').length,
      totalEarned: salaries.filter(s => s.status === 'Paid').reduce((sum, s) => sum + (s.netSalary || 0), 0),
      totalPending: salaries.filter(s => s.status === 'Pending').reduce((sum, s) => sum + (s.netSalary || 0), 0)
    };

    return successResponse(res, {
      salaries,
      stats,
      teacher: teacher.name
    }, 'Salaries fetched successfully');
  } catch (error) {
    console.error('Get teacher salaries error:', error);
    return errorResponse(res, 'Server error: ' + error.message, 500, error);
  }
};

exports.getSalaryById = async (req, res) => {
  try {
    const adminId = req.userId;
    const { id } = req.params;

    // Get admin details to find teacher
    const admin = await Admin.findById(adminId).select('teacher').lean();
    if (!admin || !admin.teacher) {
      return errorResponse(res, 'Teacher not found', 404);
    }

    // Get teacher details
    const teacher = await Teacher.findById(admin.teacher).select('name').lean();
    if (!teacher) {
      return errorResponse(res, 'Teacher not found', 404);
    }

    // Fetch salary
    let salary = await Salary.findById(id).lean();
    if (!salary) {
      return errorResponse(res, 'Salary record not found', 404);
    }

    // Manually populate teacher data
    if (salary.teacher) {
      try {
        const teacherData = await Teacher.findById(salary.teacher).select('name email profileImage').lean();
        salary.teacher = teacherData;
      } catch (err) {
        console.error('Error fetching teacher:', err);
      }
    }

    // Verify it belongs to this teacher
    if (salary.teacherName !== teacher.name) {
      return errorResponse(res, 'Unauthorized', 403);
    }

    return successResponse(res, salary, 'Salary fetched successfully');
  } catch (error) {
    console.error('Get salary error:', error);
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.getSalaryReport = async (req, res) => {
  try {
    const adminId = req.userId;

    // Get admin details to find teacher
    const admin = await Admin.findById(adminId).select('teacher').lean();
    if (!admin || !admin.teacher) {
      return errorResponse(res, 'Teacher not found', 404);
    }

    // Get teacher details
    const teacher = await Teacher.findById(admin.teacher).select('name').lean();
    if (!teacher) {
      return errorResponse(res, 'Teacher not found', 404);
    }

    // Get all salaries for this teacher - use teacher ID instead of name
    let salaries = await Salary.find({ teacher: admin.teacher }).lean();

    // Manually populate teacher data
    salaries = await Promise.all(salaries.map(async (salary) => {
      if (salary.teacher) {
        try {
          const teacherData = await Teacher.findById(salary.teacher).select('name email profileImage').lean();
          salary.teacher = teacherData;
        } catch (err) {
          console.error('Error fetching teacher:', err);
        }
      }
      return salary;
    }));

    const report = {
      totalRecords: salaries.length,
      paidCount: salaries.filter(s => s.status === 'Paid').length,
      pendingCount: salaries.filter(s => s.status === 'Pending').length,
      totalEarned: salaries.filter(s => s.status === 'Paid').reduce((sum, s) => sum + (s.netSalary || 0), 0),
      totalPending: salaries.filter(s => s.status === 'Pending').reduce((sum, s) => sum + (s.netSalary || 0), 0),
      averageSalary: salaries.length > 0 ? (salaries.reduce((sum, s) => sum + (s.netSalary || 0), 0) / salaries.length).toFixed(2) : 0
    };

    return successResponse(res, report, 'Salary report fetched successfully');
  } catch (error) {
    console.error('Get salary report error:', error);
    return errorResponse(res, 'Server error', 500, error);
  }
};
