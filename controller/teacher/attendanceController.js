const Attendance = require('../../model/Attendance');
const TeacherAttendance = require('../../model/TeacherAttendance');
const Student = require('../../model/Student');
const Admin = require('../../model/Admin');
const Teacher = require('../../model/Teacher');
const { Types: { ObjectId } } = require('mongoose');

const toObjId = (val) => {
  if (!val) return null;
  const str = String(val);
  return ObjectId.isValid(str) ? new ObjectId(str) : null;
};

// IST fix: date string "2025-07-25" ko UTC range mein convert karo
const dateToUTCRange = (dateStr) => {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const d = new Date(dateStr);
  const start = new Date(d.getTime() - IST_OFFSET_MS);
  const end = new Date(start.getTime() + (24 * 60 * 60 * 1000) - 1);
  return { start, end };
};

exports.getStudentsByClass = async (req, res) => {
  try {
    const { classId, sectionId } = req.query;

    if (!classId || !sectionId) {
      return res.status(400).json({ success: false, message: 'Class and section are required' });
    }

    // Get admin's branch
    const admin = await Admin.findById(req.userId).select('branch').lean();
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Admin not found' });
    }

    const branchId = admin.branch;
    const classObjId = toObjId(classId);
    const sectionObjId = toObjId(sectionId);

    if (!classObjId || !sectionObjId) {
      return res.status(400).json({ success: false, message: 'Invalid class or section ID' });
    }

    const students = await Student.find({
      branch: branchId,
      class: classObjId,
      section: sectionObjId,
      status: 'active'
    })
      .select('firstName lastName rollNumber')
      .sort({ rollNumber: 1 })
      .lean();

    const formattedStudents = students.map(s => ({
      studentId: s._id,
      name: `${s.firstName} ${s.lastName}`,
      rollNo: s.rollNumber
    }));

    res.status(200).json({
      success: true,
      data: formattedStudents,
      totalStudents: students.length
    });
  } catch (error) {
    console.error('Get students by class error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch students', error: error.message });
  }
};

exports.getTeacherAttendance = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const adminId = req.userId;

    console.log('=== Get Teacher Attendance ===');
    console.log('adminId:', adminId);
    console.log('startDate:', startDate);
    console.log('endDate:', endDate);

    // Get admin details
    const admin = await Admin.findById(adminId).select('branch teacher').lean();
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Admin not found' });
    }

    console.log('admin:', admin);

    const teacherId = admin.teacher;

    // Get teacher details
    const teacher = await Teacher.findById(teacherId).select('name').lean();
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }

    console.log('teacher:', teacher);
    console.log('teacherName:', teacher.name);

    let query = {
      teacherName: teacher.name
    };

    if (startDate && endDate) {
      const { start } = dateToUTCRange(startDate);
      const { end } = dateToUTCRange(endDate);
      query.date = { $gte: start, $lte: end };
      console.log('Date range:', { start, end });
    }

    console.log('Query:', query);

    const attendance = await TeacherAttendance.find(query)
      .sort({ date: -1 })
      .lean();

    console.log('Attendance records found:', attendance.length);

    res.status(200).json({
      success: true,
      data: attendance,
      total: attendance.length,
      teacher: teacher.name
    });
  } catch (error) {
    console.error('Get teacher attendance error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch teacher attendance', error: error.message });
  }
};

exports.markAttendance = async (req, res) => {
  try {
    const { date, classId, sectionId, attendanceData } = req.body;

    if (!date || !classId || !sectionId || !Array.isArray(attendanceData) || attendanceData.length === 0) {
      return res.status(400).json({ success: false, message: 'Date, class, section, and attendanceData array are required' });
    }

    // Get admin's branch
    const admin = await Admin.findById(req.userId).select('branch').lean();
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Admin not found' });
    }

    const { start: queryDate } = dateToUTCRange(date);
    const branchId = admin.branch;
    const classObjId = toObjId(classId);
    const sectionObjId = toObjId(sectionId);

    if (!classObjId || !sectionObjId) {
      return res.status(400).json({ success: false, message: 'Invalid class or section ID' });
    }

    const bulkOps = attendanceData.map(item => ({
      updateOne: {
        filter: {
          branch: branchId,
          date: queryDate,
          studentId: toObjId(item.studentId),
          classId: classObjId,
          sectionId: sectionObjId,
          type: 'student'
        },
        update: { 
          $set: { 
            status: item.status.toLowerCase(), 
            remark: item.remark || '', 
            markedBy: req.userId 
          } 
        },
        upsert: true
      }
    }));

    await Attendance.bulkWrite(bulkOps);
    res.status(200).json({ success: true, message: 'Attendance marked successfully', count: bulkOps.length });
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark attendance', error: error.message });
  }
};

exports.getAttendanceByClass = async (req, res) => {
  try {
    const { classId, sectionId, date } = req.query;

    if (!classId || !sectionId) {
      return res.status(400).json({ success: false, message: 'Class and section are required' });
    }

    // Get admin's branch
    const admin = await Admin.findById(req.userId).select('branch').lean();
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Admin not found' });
    }

    const branchId = admin.branch;
    const classObjId = toObjId(classId);
    const sectionObjId = toObjId(sectionId);

    if (!classObjId || !sectionObjId) {
      return res.status(400).json({ success: false, message: 'Invalid class or section ID' });
    }

    let rangeStart, rangeEnd, displayDate;

    if (date) {
      const range = dateToUTCRange(date);
      rangeStart = range.start;
      rangeEnd = range.end;
      displayDate = date;
    } else {
      const latestAtt = await Attendance.findOne(
        { classId: classObjId, sectionId: sectionObjId, type: 'student' },
        { date: 1 },
        { sort: { date: -1 } }
      ).lean();

      if (latestAtt) {
        rangeStart = new Date(latestAtt.date);
        rangeStart.setUTCHours(0, 0, 0, 0);
        rangeEnd = new Date(latestAtt.date);
        rangeEnd.setUTCHours(23, 59, 59, 999);
        const istDate = new Date(latestAtt.date.getTime() + (5.5 * 60 * 60 * 1000));
        displayDate = istDate.toISOString().split('T')[0];
      } else {
        const today = new Date();
        const range = dateToUTCRange(today.toISOString().split('T')[0]);
        rangeStart = range.start;
        rangeEnd = range.end;
        displayDate = today.toISOString().split('T')[0];
      }
    }

    const [students, attendanceRecords] = await Promise.all([
      Student.find({ branch: branchId, class: classObjId, section: sectionObjId, status: 'active' })
        .select('firstName lastName rollNumber')
        .sort({ rollNumber: 1 })
        .lean(),
      Attendance.find({
        branch: branchId,
        classId: classObjId,
        sectionId: sectionObjId,
        date: { $gte: rangeStart, $lte: rangeEnd },
        type: 'student'
      }).select('studentId status remark').lean()
    ]);

    const attMap = {};
    attendanceRecords.forEach(r => {
      attMap[r.studentId.toString()] = { status: r.status, remark: r.remark };
    });

    const result = students.map(s => ({
      studentId: s._id,
      name: `${s.firstName} ${s.lastName}`,
      rollNo: s.rollNumber,
      status: attMap[s._id.toString()]?.status || 'not_marked',
      remark: attMap[s._id.toString()]?.remark || ''
    }));

    res.status(200).json({
      success: true,
      data: result,
      date: displayDate,
      totalStudents: students.length,
      markedCount: attendanceRecords.length
    });
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch attendance', error: error.message });
  }
};

exports.getAttendanceStats = async (req, res) => {
  try {
    const { classId, sectionId, startDate, endDate } = req.query;

    // Get admin's branch
    const admin = await Admin.findById(req.userId).select('branch').lean();
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Admin not found' });
    }

    const matchQuery = { type: 'student', branch: admin.branch };

    const classObjId = toObjId(classId);
    if (classObjId) matchQuery.classId = classObjId;

    const sectionObjId = toObjId(sectionId);
    if (sectionObjId) matchQuery.sectionId = sectionObjId;

    if (startDate && endDate) {
      const { start } = dateToUTCRange(startDate);
      const { end } = dateToUTCRange(endDate);
      matchQuery.date = { $gte: start, $lte: end };
    }

    const stats = await Attendance.aggregate([
      { $match: matchQuery },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const statsMap = { present: 0, absent: 0, late: 0, 'half-day': 0, leave: 0 };
    stats.forEach(i => { if (statsMap[i._id] !== undefined) statsMap[i._id] = i.count; });
    const total = stats.reduce((s, i) => s + i.count, 0);

    res.status(200).json({
      success: true,
      data: {
        total,
        present: statsMap.present,
        absent: statsMap.absent,
        late: statsMap.late,
        halfDay: statsMap['half-day'],
        leave: statsMap.leave,
        attendanceRate: total > 0 ? Math.round((statsMap.present / total) * 100) : 0
      }
    });
  } catch (error) {
    console.error('Get attendance stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch attendance statistics', error: error.message });
  }
};

exports.getStudentAttendance = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { startDate, endDate } = req.query;

    // Get admin's branch
    const admin = await Admin.findById(req.userId).select('branch').lean();
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Admin not found' });
    }

    const query = {
      branch: admin.branch,
      studentId: toObjId(studentId),
      type: 'student'
    };

    if (startDate && endDate) {
      const { start } = dateToUTCRange(startDate);
      const { end } = dateToUTCRange(endDate);
      query.date = { $gte: start, $lte: end };
    }

    const attendance = await Attendance.find(query).sort({ date: -1 }).limit(100).lean();

    const stats = { total: attendance.length, present: 0, absent: 0, late: 0, leave: 0 };
    attendance.forEach(a => { if (stats[a.status] !== undefined) stats[a.status]++; });
    stats.attendanceRate = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;

    res.status(200).json({ success: true, data: attendance, stats });
  } catch (error) {
    console.error('Get student attendance error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch student attendance', error: error.message });
  }
};

exports.bulkUpdateAttendance = async (req, res) => {
  try {
    const { date, classId, sectionId, status } = req.body;

    if (!date || !classId || !sectionId || !status) {
      return res.status(400).json({ success: false, message: 'Date, class, section, and status are required' });
    }

    // Get admin's branch
    const admin = await Admin.findById(req.userId).select('branch').lean();
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Admin not found' });
    }

    const { start: queryDate } = dateToUTCRange(date);
    const branchId = admin.branch;
    const classObjId = toObjId(classId);
    const sectionObjId = toObjId(sectionId);

    if (!classObjId || !sectionObjId) {
      return res.status(400).json({ success: false, message: 'Invalid class or section ID' });
    }

    const students = await Student.find({ branch: branchId, class: classObjId, section: sectionObjId, status: 'active' })
      .select('_id').lean();

    if (students.length === 0) {
      return res.status(404).json({ success: false, message: 'No active students found in this class/section' });
    }

    const bulkOps = students.map(s => ({
      updateOne: {
        filter: { branch: branchId, date: queryDate, studentId: s._id, classId: classObjId, sectionId: sectionObjId, type: 'student' },
        update: { $set: { status: status.toLowerCase(), markedBy: req.userId } },
        upsert: true
      }
    }));

    const result = await Attendance.bulkWrite(bulkOps);
    res.status(200).json({
      success: true, 
      message: 'Bulk attendance updated successfully',
      modifiedCount: result.modifiedCount, 
      upsertedCount: result.upsertedCount
    });
  } catch (error) {
    console.error('Bulk update attendance error:', error);
    res.status(500).json({ success: false, message: 'Failed to update attendance', error: error.message });
  }
};

exports.getAttendanceReport = async (req, res) => {
  try {
    const { classId, sectionId, startDate, endDate } = req.query;

    if (!classId || !sectionId || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Class, section, startDate, and endDate are required' });
    }

    // Get admin's branch
    const admin = await Admin.findById(req.userId).select('branch').lean();
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Admin not found' });
    }

    const branchId = admin.branch;
    const classObjId = toObjId(classId);
    const sectionObjId = toObjId(sectionId);

    if (!classObjId || !sectionObjId) {
      return res.status(400).json({ success: false, message: 'Invalid class or section ID' });
    }

    const { start } = dateToUTCRange(startDate);
    const { end } = dateToUTCRange(endDate);

    const [students, attendance] = await Promise.all([
      Student.find({ branch: branchId, class: classObjId, section: sectionObjId, status: 'active' })
        .select('firstName lastName rollNumber')
        .lean(),
      Attendance.find({
        branch: branchId, classId: classObjId, sectionId: sectionObjId, type: 'student',
        date: { $gte: start, $lte: end }
      }).select('studentId status').lean()
    ]);

    const attByStudent = {};
    attendance.forEach(r => {
      const sid = r.studentId.toString();
      if (!attByStudent[sid]) attByStudent[sid] = { present: 0, absent: 0, late: 0, total: 0 };
      if (attByStudent[sid][r.status] !== undefined) attByStudent[sid][r.status]++;
      attByStudent[sid].total++;
    });

    const report = students.map(s => {
      const st = attByStudent[s._id.toString()] || { present: 0, absent: 0, late: 0, total: 0 };
      return {
        studentId: s._id,
        name: `${s.firstName} ${s.lastName}`,
        rollNumber: s.rollNumber,
        ...st,
        attendanceRate: st.total > 0 ? Math.round((st.present / st.total) * 100) : 0
      };
    });

    res.status(200).json({ success: true, data: report, period: { startDate, endDate } });
  } catch (error) {
    console.error('Get attendance report error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate attendance report', error: error.message });
  }
};
