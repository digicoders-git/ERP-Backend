const Attendance = require('../../model/Attendance');
const Student = require('../../model/Student');
const { Types: { ObjectId } } = require('mongoose');

const toObjId = (val) => {
  if (!val) return null;
  const str = String(val);
  return ObjectId.isValid(str) ? new ObjectId(str) : null;
};

// IST fix: date string "2025-07-25" ko UTC range mein convert karo
// IST = UTC+5:30, so "2025-07-25" IST = "2025-07-24T18:30:00Z" to "2025-07-25T18:29:59Z"
const dateToUTCRange = (dateStr) => {
  // Parse date string as IST (UTC+5:30)
  // "2025-07-25" IST 00:00 = 2025-07-24T18:30:00Z
  // "2025-07-25" IST 23:59 = 2025-07-25T18:29:59Z
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

  const d = new Date(dateStr); // parsed as UTC midnight
  // Convert to IST start of day in UTC
  const start = new Date(d.getTime() - IST_OFFSET_MS);
  // End = start + 24 hours - 1ms
  const end = new Date(start.getTime() + (24 * 60 * 60 * 1000) - 1);

  return { start, end };
};

exports.markAttendance = async (req, res) => {
  try {
    const { date, classId, sectionId, attendanceData } = req.body;

    if (!date || !classId || !sectionId || !Array.isArray(attendanceData) || attendanceData.length === 0) {
      return res.status(400).json({ success: false, message: 'Date, class, section, and attendanceData array are required' });
    }

    const { start: queryDate } = dateToUTCRange(date);

    const branchId = toObjId(req.user.branch);
    const classObjId = toObjId(classId);
    const sectionObjId = toObjId(sectionId);

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
        update: { $set: { status: item.status.toLowerCase(), remark: item.remark || '', markedBy: toObjId(req.userId) } },
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

    const branchId = toObjId(req.user.branch);
    const classObjId = toObjId(classId);
    const sectionObjId = toObjId(sectionId);

    let rangeStart, rangeEnd, displayDate;

    if (date) {
      const range = dateToUTCRange(date);
      rangeStart = range.start;
      rangeEnd = range.end;
      displayDate = date;
    } else {
      // Latest attendance date dhundo
      const latestAtt = await Attendance.findOne(
        { classId: classObjId, sectionId: sectionObjId, type: 'student' },
        { date: 1 },
        { sort: { date: -1 } }
      ).lean();

      if (latestAtt) {
        // DB mein jo date hai uske aas paas ka full day range
        rangeStart = new Date(latestAtt.date);
        rangeStart.setUTCHours(0, 0, 0, 0);
        rangeEnd = new Date(latestAtt.date);
        rangeEnd.setUTCHours(23, 59, 59, 999);
        // Display date IST mein
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
        .select('firstName lastName rollNumber').lean(),
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
      id: s._id,
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

    const matchQuery = { type: 'student' };

    const branchId = toObjId(req.user.branch);
    if (branchId) matchQuery.branch = branchId;

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

    const statsMap = { present: 0, absent: 0, late: 0, 'half-day': 0 };
    stats.forEach(i => { statsMap[i._id] = i.count; });
    const total = stats.reduce((s, i) => s + i.count, 0);

    res.status(200).json({
      success: true,
      data: {
        total,
        present: statsMap.present,
        absent: statsMap.absent,
        late: statsMap.late,
        halfDay: statsMap['half-day'],
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

    const query = {
      branch: toObjId(req.user.branch),
      studentId: toObjId(studentId),
      type: 'student'
    };

    if (startDate && endDate) {
      const { start } = dateToUTCRange(startDate);
      const { end } = dateToUTCRange(endDate);
      query.date = { $gte: start, $lte: end };
    }

    const attendance = await Attendance.find(query).sort({ date: -1 }).limit(100).lean();

    const stats = { total: attendance.length, present: 0, absent: 0, late: 0 };
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

    const { start: queryDate } = dateToUTCRange(date);
    const branchId = toObjId(req.user.branch);
    const classObjId = toObjId(classId);
    const sectionObjId = toObjId(sectionId);

    const students = await Student.find({ branch: branchId, class: classObjId, section: sectionObjId, status: 'active' })
      .select('_id').lean();

    if (students.length === 0) {
      return res.status(404).json({ success: false, message: 'No active students found in this class/section' });
    }

    const bulkOps = students.map(s => ({
      updateOne: {
        filter: { branch: branchId, date: queryDate, studentId: s._id, classId: classObjId, sectionId: sectionObjId, type: 'student' },
        update: { $set: { status: status.toLowerCase(), markedBy: toObjId(req.userId) } },
        upsert: true
      }
    }));

    const result = await Attendance.bulkWrite(bulkOps);
    res.status(200).json({
      success: true, message: 'Bulk attendance updated successfully',
      modifiedCount: result.modifiedCount, upsertedCount: result.upsertedCount
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

    const branchId = toObjId(req.user.branch);
    const classObjId = toObjId(classId);
    const sectionObjId = toObjId(sectionId);
    const { start } = dateToUTCRange(startDate);
    const { end } = dateToUTCRange(endDate);

    const [students, attendance] = await Promise.all([
      Student.find({ branch: branchId, class: classObjId, section: sectionObjId, status: 'active' })
        .select('firstName lastName rollNumber').lean(),
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
