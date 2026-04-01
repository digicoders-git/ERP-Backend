const TeacherAttendance = require('../../model/TeacherAttendance');
const { successResponse, errorResponse } = require('../../responseFormatter');

exports.getAllAttendance = async (req, res) => {
  try {
    const attendance = await TeacherAttendance.find().sort({ date: -1 });
    return successResponse(res, attendance, 'Attendance records fetched successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
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
    const { teacherName, date, status, checkIn, checkOut, remarks } = req.body;

    if (!teacherName || !date || !status) {
      return errorResponse(res, 'Required fields missing', 400);
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
    const { teacherName, date, status, checkIn, checkOut, remarks } = req.body;
    const attendance = await TeacherAttendance.findById(req.params.id);

    if (!attendance) {
      return errorResponse(res, 'Attendance record not found', 404);
    }

    if (teacherName) attendance.teacherName = teacherName;
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
