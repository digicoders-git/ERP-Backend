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

    // Get admin's branch and teacher profile
    const admin = await Admin.findById(req.userId).select('branch teacher role').lean();
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Admin not found' });
    }

    const branchId = admin.branch;
    const teacherProfileId = admin.teacher;
    const classObjId = toObjId(classId);
    const sectionObjId = toObjId(sectionId);

    if (!classObjId || !sectionObjId) {
      return res.status(400).json({ success: false, message: 'Invalid class or section ID' });
    }

    // Role-based check: Only class teacher or substitute can mark attendance
    const teacher = await Teacher.findById(teacherProfileId).select('assignedClass assignedSection').lean();
    
    let isAuthorized = false;

    // 1. Check if Primary Class Teacher
    if (teacher && 
        String(teacher.assignedClass) === String(classId) && 
        String(teacher.assignedSection) === String(sectionId)) {
      isAuthorized = true;
    }

    // 2. Check if Substitute Teacher for today
    if (!isAuthorized) {
      const SubstituteTeacher = require('../../model/SubstituteTeacher');
      const now = new Date();
      const substitute = await SubstituteTeacher.findOne({
        branch: branchId,
        substituteTeacherId: teacherProfileId,
        classId: classObjId,
        sectionId: sectionObjId,
        startDate: { $lte: now },
        endDate: { $gte: now }
      }).lean();

      if (substitute) isAuthorized = true;
    }

    // 3. Admin / Branch Admin override (optional, but requested role-based behavior)
    if (admin.role === 'branchAdmin' || admin.role === 'superAdmin') {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access Denied: Only the Class Teacher or a Substitute can mark student attendance.' 
      });
    }

    // 4. Check Attendance Mode Settings
    const AttendanceSetting = require('../../model/AttendanceSetting');
    const settings = await AttendanceSetting.findOne({ branch: branchId });
    
    if (settings) {
      // If mode is Biometric Only and teacher override is not allowed, block manual entry
      if (settings.mode === 'biometric' && !settings.allowTeacherOverride) {
        return res.status(400).json({ 
          success: false, 
          message: 'Manual entry disabled: System is in Biometric Only mode' 
        });
      }
      
      // If mode is App Based, usually students mark, but we can allow teacher monitor/edit if needed
      // For now, let's allow it unless strictly blocked
    }

    const { start: queryDate } = dateToUTCRange(date);

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
            markedBy: req.userId,
            markedByType: 'Admin'
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

    // Get admin's branch and teacher profile
    const admin = await Admin.findById(req.userId).select('branch teacher role').lean();
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Admin not found' });
    }

    const teacherProfileId = admin.teacher;
    const teacher = await Teacher.findById(teacherProfileId).select('assignedClass assignedSection').lean();
    
    // Get the actual primary class teacher for this class/section
    const primaryTeacher = await Teacher.findOne({
      assignedClass: classId,
      assignedSection: sectionId
    }).select('name').lean();

    const branchId = admin.branch;
    const classObjId = toObjId(classId);
    const sectionObjId = toObjId(sectionId);

    if (!classObjId || !sectionObjId) {
      return res.status(400).json({ success: false, message: 'Invalid class or section ID' });
    }

    // Check if authorized to MARK (only class teacher or substitute or admin)
    let isClassTeacher = false;
    let isSubstitute = false;

    if (teacher && 
        String(teacher.assignedClass) === String(classId) && 
        String(teacher.assignedSection) === String(sectionId)) {
      isClassTeacher = true;
    }

    // Check Substitute for the given date
    if (!isClassTeacher) {
      const SubstituteTeacher = require('../../model/SubstituteTeacher');
      const targetDate = date ? new Date(date) : new Date();
      const substitute = await SubstituteTeacher.findOne({
        branch: admin.branch,
        substituteTeacherId: teacherProfileId,
        classId: classObjId,
        sectionId: sectionObjId,
        startDate: { $lte: targetDate },
        endDate: { $gte: targetDate }
      }).lean();
      
      if (substitute) isSubstitute = true;
    }

    // Admins are always authorized
    const isAuthorized = isClassTeacher || isSubstitute || ['branchAdmin', 'superAdmin'].includes(admin.role);

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
      })
      .select('studentId status remark markedBy markedByType source')
      .populate({
        path: 'markedBy',
        select: 'name email role teacher staff',
        populate: [
          { path: 'teacher', select: 'name' },
          { path: 'staff', select: 'name' }
        ]
      })
      .lean()
    ]);

    const attMap = {};
    attendanceRecords.forEach(r => {
      attMap[r.studentId.toString()] = { status: r.status, remark: r.remark };
    });

    const result = students.map(s => {
      const record = attendanceRecords.find(r => r.studentId.toString() === s._id.toString());
      
      let markerName = 'Unknown';
      if (record?.markedBy) {
        const marker = record.markedBy;
        const markerTeacherId = marker.teacher?._id || marker.teacher; // Handle populated or ID
        
        const isPrimary = primaryTeacher && String(primaryTeacher._id) === String(markerTeacherId);
        
        markerName = marker.name || marker.teacher?.name || marker.staff?.name || marker.email || 'Staff';
        
        if (marker.role === 'branchAdmin') {
          markerName += ' (Admin)';
        } else if (isPrimary) {
          markerName += ' (Class Teacher)';
        } else {
          markerName += ' (Substitute)';
        }
      }

      return {
        studentId: s._id,
        name: `${s.firstName} ${s.lastName}`,
        rollNo: s.rollNumber,
        status: record?.status || 'not_marked',
        remark: record?.remark || '',
        source: record?.source || 'manual',
        markedBy: record ? markerName : null
      };
    });

    res.status(200).json({
      success: true,
      data: result,
      date: displayDate,
      totalStudents: students.length,
      markedCount: attendanceRecords.length,
      isClassTeacher,
      isSubstitute,
      isAuthorized
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

    // Get admin's branch and teacher profile
    const admin = await Admin.findById(req.userId).select('branch teacher role').lean();
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Admin not found' });
    }

    const teacherProfileId = admin.teacher;
    const teacher = await Teacher.findById(teacherProfileId).select('assignedClass assignedSection').lean();
    
    let isAuthorized = false;
    if (teacher && 
        String(teacher.assignedClass) === String(classId) && 
        String(teacher.assignedSection) === String(sectionId)) {
      isAuthorized = true;
    }

    if (admin.role === 'branchAdmin' || admin.role === 'superAdmin') {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Access Denied: You can only bulk update your own assigned class.' });
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
