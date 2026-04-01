const Attendance = require('../../model/Attendance');
const Student = require('../../model/Student');
const Assignment = require('../../model/Assignment');
const { Types: { ObjectId } } = require('mongoose');

const toObjId = (val) => {
  if (!val) return null;
  const str = String(val);
  return ObjectId.isValid(str) ? new ObjectId(str) : null;
};

// IST fix: "2025-07-25" → UTC range covering that full IST day
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const dateToUTCRange = (dateStr) => {
  const d = new Date(dateStr); // parsed as UTC midnight
  const start = new Date(d.getTime() - IST_OFFSET_MS);
  const end = new Date(start.getTime() + (24 * 60 * 60 * 1000) - 1);
  return { start, end };
};

exports.getAcademicReport = async (req, res) => {
  try {
    const { classId, sectionId, startDate, endDate } = req.query;
    const branchId = toObjId(req.user.branch);
    const classObjId = toObjId(classId);
    const sectionObjId = toObjId(sectionId);

    if (!classObjId || !sectionObjId) {
      return res.status(400).json({ success: false, message: 'Class and section are required' });
    }

    const assignmentQuery = { branch: branchId, class: classObjId, section: sectionObjId };
    if (startDate && endDate) {
      const { start } = dateToUTCRange(startDate);
      const { end } = dateToUTCRange(endDate);
      assignmentQuery.createdAt = { $gte: start, $lte: end };
    }

    const [totalStudents, assignments] = await Promise.all([
      Student.countDocuments({ branch: branchId, class: classObjId, section: sectionObjId, status: 'active' }),
      Assignment.find(assignmentQuery).select('title totalStudents submitted dueDate status').lean()
    ]);

    const totalAssignments = assignments.length;
    const totalSubmissions = assignments.reduce((s, a) => s + (a.submitted || 0), 0);
    const avgSubmissionRate = totalAssignments > 0 && totalStudents > 0
      ? Math.round((totalSubmissions / (totalAssignments * totalStudents)) * 100) : 0;
    const pendingAssignments = assignments.filter(a => a.status === 'active' && new Date(a.dueDate) >= new Date()).length;

    res.status(200).json({
      success: true,
      data: {
        totalStudents, totalAssignments, totalSubmissions,
        avgSubmissionRate, pendingAssignments,
        completedAssignments: totalAssignments - pendingAssignments
      }
    });
  } catch (error) {
    console.error('Get academic report error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate academic report', error: error.message });
  }
};

exports.getAttendanceAnalytics = async (req, res) => {
  try {
    const { classId, sectionId, period = 'monthly' } = req.query;

    const classObjId = toObjId(classId);
    const sectionObjId = toObjId(sectionId);
    const branchId = toObjId(req.user.branch);

    if (!classObjId || !sectionObjId) {
      return res.status(400).json({ success: false, message: 'Class and section are required' });
    }

    // Auto date range - last 6 months or 12 weeks, IST adjusted
    const now = new Date();
    const utcEnd = new Date(now.getTime() - IST_OFFSET_MS + (24 * 60 * 60 * 1000) - 1);
    const utcStart = new Date(utcEnd);
    if (period === 'monthly') {
      utcStart.setMonth(utcStart.getMonth() - 6);
    } else {
      utcStart.setDate(utcStart.getDate() - 84);
    }

    const matchQuery = {
      type: 'student',
      classId: classObjId,
      sectionId: sectionObjId,
      date: { $gte: utcStart, $lte: utcEnd }
    };
    if (branchId) matchQuery.branch = branchId;

    const attendanceData = await Attendance.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: period === 'monthly'
            ? { year: { $year: { date: '$date', timezone: 'Asia/Kolkata' } }, month: { $month: { date: '$date', timezone: 'Asia/Kolkata' } } }
            : { year: { $year: { date: '$date', timezone: 'Asia/Kolkata' } }, week: { $week: { date: '$date', timezone: 'Asia/Kolkata' } } },
          total: { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.week': 1 } }
    ]);

    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const trends = attendanceData.map(item => ({
      period: period === 'monthly' ? monthNames[item._id.month - 1] : `Week ${item._id.week}`,
      rate: item.total > 0 ? Math.round((item.present / item.total) * 100) : 0,
      present: item.present, absent: item.absent, late: item.late
    }));

    const totalPresent = attendanceData.reduce((s, i) => s + i.present, 0);
    const totalAbsent = attendanceData.reduce((s, i) => s + i.absent, 0);
    const totalLate = attendanceData.reduce((s, i) => s + i.late, 0);
    const totalRecords = attendanceData.reduce((s, i) => s + i.total, 0);
    const avgAttendance = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0;

    res.status(200).json({
      success: true,
      data: {
        trends,
        stats: { avgAttendance, totalPresent, totalAbsent, totalLate },
        statusDistribution: { present: totalPresent, absent: totalAbsent, late: totalLate }
      }
    });
  } catch (error) {
    console.error('Get attendance analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate attendance analytics', error: error.message });
  }
};

exports.getGradeDistribution = async (req, res) => {
  try {
    const { classId, sectionId } = req.query;
    const branchId = toObjId(req.user.branch);
    const classObjId = toObjId(classId);
    const sectionObjId = toObjId(sectionId);

    if (!classObjId || !sectionObjId) {
      return res.status(400).json({ success: false, message: 'Class and section are required' });
    }

    const [totalStudents, attendanceStats] = await Promise.all([
      Student.countDocuments({ branch: branchId, class: classObjId, section: sectionObjId, status: 'active' }),
      Attendance.aggregate([
        { $match: { classId: classObjId, sectionId: sectionObjId, type: 'student' } },
        { $group: { _id: '$studentId', total: { $sum: 1 }, present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } } } },
        { $project: { attendanceRate: { $cond: [{ $gt: ['$total', 0] }, { $multiply: [{ $divide: ['$present', '$total'] }, 100] }, 0] } } }
      ])
    ]);

    const distribution = { 'A+ (>95%)': 0, 'A (90-95%)': 0, 'B (80-90%)': 0, 'C (70-80%)': 0, 'D (<70%)': 0 };
    attendanceStats.forEach(s => {
      const r = s.attendanceRate;
      if (r > 95) distribution['A+ (>95%)']++;
      else if (r >= 90) distribution['A (90-95%)']++;
      else if (r >= 80) distribution['B (80-90%)']++;
      else if (r >= 70) distribution['C (70-80%)']++;
      else distribution['D (<70%)']++;
    });

    res.status(200).json({ success: true, data: distribution, totalStudents });
  } catch (error) {
    console.error('Get grade distribution error:', error);
    res.status(500).json({ success: false, message: 'Failed to get grade distribution', error: error.message });
  }
};

exports.getStudentProgress = async (req, res) => {
  try {
    const { studentId } = req.params;
    const branchId = toObjId(req.user.branch);
    const studentObjId = toObjId(studentId);

    const student = await Student.findOne({ _id: studentObjId, branch: branchId })
      .populate('class', 'className')
      .populate('section', 'sectionName')
      .lean();

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const classObjId = toObjId(student.class?._id);
    const sectionObjId = toObjId(student.section?._id);

    const [attendanceStats, assignments] = await Promise.all([
      Attendance.aggregate([
        { $match: { branch: branchId, studentId: studentObjId, type: 'student' } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Assignment.find({ branch: branchId, class: classObjId, section: sectionObjId })
        .select('title dueDate status submitted totalStudents').lean()
    ]);

    const attMap = {};
    attendanceStats.forEach(i => { attMap[i._id] = i.count; });
    const totalAtt = attendanceStats.reduce((s, i) => s + i.count, 0);

    res.status(200).json({
      success: true,
      data: {
        student: {
          id: student._id,
          name: `${student.firstName} ${student.lastName}`,
          rollNumber: student.rollNumber,
          class: student.class?.className,
          section: student.section?.sectionName
        },
        attendance: {
          total: totalAtt,
          present: attMap.present || 0,
          absent: attMap.absent || 0,
          late: attMap.late || 0,
          rate: totalAtt > 0 ? Math.round(((attMap.present || 0) / totalAtt) * 100) : 0
        },
        academic: {
          totalAssignments: assignments.length,
          activeAssignments: assignments.filter(a => a.status === 'active').length
        }
      }
    });
  } catch (error) {
    console.error('Get student progress error:', error);
    res.status(500).json({ success: false, message: 'Failed to get student progress', error: error.message });
  }
};

exports.exportReport = async (req, res) => {
  try {
    const { type = 'json', reportType, classId, sectionId, startDate, endDate } = req.query;
    res.status(200).json({
      success: true,
      message: 'Use /attendance/report or /academic endpoints for data',
      params: { type, reportType, classId, sectionId, period: { startDate, endDate } }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to export report', error: error.message });
  }
};
