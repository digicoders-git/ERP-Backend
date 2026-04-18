const TeacherAttendance = require('../../model/TeacherAttendance');
const Teacher = require('../../model/Teacher');
const { successResponse, errorResponse } = require('../../responseFormatter');

exports.getAllAttendance = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status } = req.query;
    const query = {};
    
    if (search) {
      query.$or = [
        { teacherName: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status) {
      query.status = status;
    }

    const [attendance, total] = await Promise.all([
      TeacherAttendance.find(query)
        .populate('teacher', 'name profileImage email')
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      TeacherAttendance.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      data: attendance,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      message: 'Attendance records fetched successfully'
    });
  } catch (error) {
    console.error('Attendance fetch error:', error);
    return errorResponse(res, 'Server error: ' + error.message, 500, error);
  }
};

exports.getAttendanceById = async (req, res) => {
  try {
    const attendance = await TeacherAttendance.findById(req.params.id);
    if (!attendance) {
      return errorResponse(res, 'Attendance record not found', 404);
    }
    return successResponse(res, attendance, 'Attendance record fetched successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.markAttendance = async (req, res) => {
  try {
    const { teacher, teacherName, date, status, checkIn, checkOut, remarks } = req.body;

    if (!teacherName || !date || !status) {
      return errorResponse(res, 'Required fields missing', 400);
    }

    // Check if teacher exists in database
    const teacherExists = await Teacher.findOne({ name: teacherName });
    if (!teacherExists) {
      return errorResponse(res, 'Teacher not found in database', 404);
    }

    let workingHours = 0;
    if (status !== 'Absent' && checkIn && checkOut) {
      const [inHour, inMin] = checkIn.split(':').map(Number);
      const [outHour, outMin] = checkOut.split(':').map(Number);
      const inTime = inHour + inMin / 60;
      const outTime = outHour + outMin / 60;
      workingHours = Math.max(0, outTime - inTime);
    }

    const attendance = new TeacherAttendance({
      teacher: teacherExists._id,
      teacherName,
      date: new Date(date),
      status,
      checkIn: status !== 'Absent' ? checkIn : null,
      checkOut: status !== 'Absent' ? checkOut : null,
      workingHours,
      remarks: remarks || ''
    });

    await attendance.save();
    return successResponse(res, attendance, 'Attendance marked successfully', 201);
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.updateAttendance = async (req, res) => {
  try {
    const { teacher, teacherName, date, status, checkIn, checkOut, remarks } = req.body;
    const attendance = await TeacherAttendance.findById(req.params.id);

    if (!attendance) {
      return errorResponse(res, 'Attendance record not found', 404);
    }

    if (teacherName) {
      const teacherExists = await Teacher.findOne({ name: teacherName });
      if (!teacherExists) {
        return errorResponse(res, 'Teacher not found in database', 404);
      }
      attendance.teacher = teacherExists._id;
      attendance.teacherName = teacherName;
    }
    if (date) attendance.date = new Date(date);
    if (status) attendance.status = status;
    if (remarks) attendance.remarks = remarks;

    if (status !== 'Absent') {
      if (checkIn) attendance.checkIn = checkIn;
      if (checkOut) attendance.checkOut = checkOut;

      if (checkIn && checkOut) {
        const [inHour, inMin] = checkIn.split(':').map(Number);
        const [outHour, outMin] = checkOut.split(':').map(Number);
        const inTime = inHour + inMin / 60;
        const outTime = outHour + outMin / 60;
        attendance.workingHours = Math.max(0, outTime - inTime);
      }
    } else {
      attendance.checkIn = null;
      attendance.checkOut = null;
      attendance.workingHours = 0;
    }

    await attendance.save();
    return successResponse(res, attendance, 'Attendance updated successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.deleteAttendance = async (req, res) => {
  try {
    const attendance = await TeacherAttendance.findByIdAndDelete(req.params.id);
    if (!attendance) {
      return errorResponse(res, 'Attendance record not found', 404);
    }
    return successResponse(res, null, 'Attendance record deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.getAttendanceByTeacher = async (req, res) => {
  try {
    const { teacherName } = req.params;
    const attendance = await TeacherAttendance.find({ teacherName }).sort({ date: -1 });
    return successResponse(res, attendance, 'Attendance records fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.getAttendanceByDate = async (req, res) => {
  try {
    const { date } = req.params;
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);

    const attendance = await TeacherAttendance.find({
      date: { $gte: startDate, $lt: endDate }
    });

    return successResponse(res, attendance, 'Attendance records fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.getAttendanceByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    if (!['Present', 'Absent', 'Late', 'Leave'].includes(status)) {
      return errorResponse(res, 'Invalid status', 400);
    }

    const attendance = await TeacherAttendance.find({ status });
    return successResponse(res, attendance, `${status} records fetched`);
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.getRegisteredTeachers = async (req, res) => {
  try {
    const teachers = await Teacher.find({ status: true })
      .select('_id name email profileImage')
      .sort({ name: 1 });
    
    return successResponse(res, teachers, 'Registered teachers fetched successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.getAttendanceReport = async (req, res) => {
  try {
    const totalRecords = await TeacherAttendance.countDocuments();
    const presentCount = await TeacherAttendance.countDocuments({ status: 'Present' });
    const absentCount = await TeacherAttendance.countDocuments({ status: 'Absent' });
    const lateCount = await TeacherAttendance.countDocuments({ status: 'Late' });
    const leaveCount = await TeacherAttendance.countDocuments({ status: 'Leave' });

    const avgWorkingHours = await TeacherAttendance.aggregate([
      { $group: { _id: null, average: { $avg: '$workingHours' } } }
    ]);

    const report = {
      totalRecords,
      presentCount,
      absentCount,
      lateCount,
      leaveCount,
      averageWorkingHours: avgWorkingHours[0]?.average.toFixed(2) || 0
    };

    return successResponse(res, report, 'Attendance report fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};
