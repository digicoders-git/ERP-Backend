const Teacher = require('../../model/Teacher');
const Student = require('../../model/Student');
const Assignment = require('../../model/Assignment');
const Attendance = require('../../model/Attendance');
const Notice = require('../../model/Notice');
const Timetable = require('../../model/Timetable');

exports.getDashboardStats = async (req, res) => {
  try {
    const adminId = req.userId;           // Admin._id (teacherAdmin)
    const teacherId = req.user.teacher;   // Teacher._id from token
    const branch = req.user.branch;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date().getDay()];

    // All parallel - fast loading
    const [teacher, todayClasses, totalAssignments, pendingAssignments, recentNotices] = await Promise.all([
      Teacher.findById(teacherId).select('name email subjects').lean(),
      Timetable.find({ branch, teacherId: adminId, day: dayOfWeek })
        .populate('classId', 'className')
        .populate('sectionId', 'sectionName')
        .sort({ startTime: 1 })
        .lean(),
      Assignment.countDocuments({ branch, teacherId: adminId }),
      Assignment.countDocuments({ branch, teacherId: adminId, dueDate: { $gte: today }, status: 'active' }),
      Notice.find({ branch, isPublished: true })
        .sort({ createdAt: -1 }).limit(5)
        .select('title type publishDate').lean()
    ]);

    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }

    // Get unique classes from timetable
    const classMap = new Map();
    todayClasses.forEach(e => {
      const key = `${e.classId?._id}-${e.sectionId?._id}`;
      if (!classMap.has(key)) classMap.set(key, { classId: e.classId?._id, sectionId: e.sectionId?._id });
    });
    const classes = Array.from(classMap.values());
    const classIds = classes.map(c => c.classId).filter(Boolean);
    const sectionIds = classes.map(c => c.sectionId).filter(Boolean);

    // Student count + today attendance - parallel
    const [totalStudents, todayAttendance] = await Promise.all([
      classIds.length > 0
        ? Student.countDocuments({ branch, class: { $in: classIds }, section: { $in: sectionIds }, status: 'active' })
        : Promise.resolve(0),
      classIds.length > 0
        ? Attendance.aggregate([
            { $match: { branch, date: today, type: 'student', classId: { $in: classIds } } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ])
        : Promise.resolve([])
    ]);

    const attMap = {};
    todayAttendance.forEach(i => { attMap[i._id] = i.count; });
    const totalMarked = todayAttendance.reduce((s, i) => s + i.count, 0);
    const attendanceRate = totalMarked > 0 ? Math.round(((attMap.present || 0) / totalMarked) * 100) : 0;

    // Upcoming classes (after current time)
    const now = new Date();
    const upcomingClasses = todayClasses
      .filter(cls => {
        const time = cls.startTime || (cls.classTime ? cls.classTime.split('-')[0]?.trim() : null);
        if (!time) return false;
        const [h, m] = time.split(':');
        const t = new Date(today);
        t.setHours(parseInt(h), parseInt(m), 0);
        return t > now;
      })
      .slice(0, 3)
      .map(cls => ({
        id: cls._id,
        time: cls.classTime || `${cls.startTime}-${cls.endTime}`,
        class: cls.classId?.className || cls.className,
        section: cls.sectionId?.sectionName,
        subject: cls.subject,
        room: cls.room
      }));

    res.status(200).json({
      success: true,
      data: {
        teacher: { name: teacher.name, email: teacher.email, subjects: teacher.subjects },
        stats: {
          totalClasses: classes.length,
          totalStudents,
          totalAssignments,
          pendingAssignments,
          todayClassCount: todayClasses.length,
          attendanceRate
        },
        todayAttendance: {
          total: totalMarked,
          present: attMap.present || 0,
          absent: attMap.absent || 0,
          late: attMap.late || 0
        },
        upcomingClasses,
        recentNotices: recentNotices.map(n => ({ id: n._id, title: n.title, type: n.type, date: n.publishDate }))
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard statistics', error: error.message });
  }
};

exports.getTeacherClasses = async (req, res) => {
  try {
    const adminId = req.userId;
    const branch = req.user.branch;

    const timetableEntries = await Timetable.find({ branch, teacherId: adminId })
      .populate('classId', 'className classCode')
      .populate('sectionId', 'sectionName')
      .lean();

    const classMap = new Map();
    timetableEntries.forEach(e => {
      const key = `${e.classId?._id}-${e.sectionId?._id}`;
      if (!classMap.has(key)) {
        classMap.set(key, {
          id: e.classId?._id,
          name: `${e.classId?.className || e.className || ''} ${e.sectionId?.sectionName || ''}`.trim(),
          class: e.classId?.className || e.className,
          section: e.sectionId?.sectionName,
          subject: e.subject,
          room: e.room,
          classId: e.classId?._id,
          sectionId: e.sectionId?._id,
          schedule: []
        });
      }
      classMap.get(key).schedule.push({
        day: e.day,
        time: e.classTime || `${e.startTime || ''}-${e.endTime || ''}`
      });
    });

    const classEntries = Array.from(classMap.values());

    // Get student counts + attendance in parallel
    const enriched = await Promise.all(classEntries.map(async cls => {
      if (!cls.classId || !cls.sectionId) return { ...cls, students: 0, attendance: 0 };

      const [studentCount, attData] = await Promise.all([
        Student.countDocuments({ branch, class: cls.classId, section: cls.sectionId, status: 'active' }),
        Attendance.aggregate([
          { $match: { branch, classId: cls.classId, sectionId: cls.sectionId, type: 'student' } },
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ])
      ]);

      const total = attData.reduce((s, i) => s + i.count, 0);
      const present = attData.find(i => i._id === 'present')?.count || 0;
      return { ...cls, students: studentCount, attendance: total > 0 ? Math.round((present / total) * 100) : 0 };
    }));

    res.status(200).json({ success: true, data: enriched, total: enriched.length });
  } catch (error) {
    console.error('Get teacher classes error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch teacher classes', error: error.message });
  }
};

exports.getStudentsByClass = async (req, res) => {
  try {
    const { classId, sectionId } = req.query;
    const branch = req.user.branch;

    if (!classId || !sectionId) {
      return res.status(400).json({ success: false, message: 'Class and section are required' });
    }

    const students = await Student.find({ branch, class: classId, section: sectionId, status: 'active' })
      .select('firstName lastName rollNumber email phone profileImage')
      .sort({ rollNumber: 1 })
      .lean();

    // Batch attendance for all students at once
    const studentIds = students.map(s => s._id);
    const attData = await Attendance.aggregate([
      { $match: { branch, studentId: { $in: studentIds }, type: 'student' } },
      { $group: { _id: { studentId: '$studentId', status: '$status' }, count: { $sum: 1 } } }
    ]);

    // Build map
    const attMap = {};
    attData.forEach(item => {
      const sid = item._id.studentId.toString();
      if (!attMap[sid]) attMap[sid] = { present: 0, absent: 0, late: 0, total: 0 };
      attMap[sid][item._id.status] = item.count;
      attMap[sid].total += item.count;
    });

    const result = students.map(s => {
      const att = attMap[s._id.toString()] || { present: 0, total: 0 };
      return {
        ...s,
        name: `${s.firstName} ${s.lastName}`,
        attendanceRate: att.total > 0 ? Math.round((att.present / att.total) * 100) : 0,
        totalClasses: att.total
      };
    });

    res.status(200).json({ success: true, data: result, total: result.length });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch students', error: error.message });
  }
};

exports.getRecentActivities = async (req, res) => {
  try {
    const adminId = req.userId;
    const branch = req.user.branch;
    const { limit = 10 } = req.query;

    const [recentAssignments, recentNotices] = await Promise.all([
      Assignment.find({ branch, teacherId: adminId })
        .sort({ createdAt: -1 }).limit(5)
        .select('title class section createdAt')
        .populate('class', 'className')
        .populate('section', 'sectionName')
        .lean(),
      Notice.find({ branch, createdBy: adminId })
        .sort({ createdAt: -1 }).limit(5)
        .select('title type createdAt').lean()
    ]);

    const activities = [
      ...recentAssignments.map(a => ({
        id: a._id, type: 'assignment',
        title: `Created assignment: ${a.title}`,
        class: a.class?.className, section: a.section?.sectionName,
        timestamp: a.createdAt, icon: 'assignment'
      })),
      ...recentNotices.map(n => ({
        id: n._id, type: 'notice',
        title: `Published notice: ${n.title}`,
        noticeType: n.type, timestamp: n.createdAt, icon: 'notice'
      }))
    ];

    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.status(200).json({ success: true, data: activities.slice(0, parseInt(limit)) });
  } catch (error) {
    console.error('Get recent activities error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch recent activities', error: error.message });
  }
};

exports.getUpcomingClasses = async (req, res) => {
  try {
    const adminId = req.userId;
    const branch = req.user.branch;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date().getDay()];

    const todayClasses = await Timetable.find({ branch, teacherId: adminId, day: dayOfWeek })
      .populate('classId', 'className')
      .populate('sectionId', 'sectionName')
      .sort({ startTime: 1 })
      .lean();

    const now = new Date();
    const upcoming = todayClasses
      .filter(cls => {
        const time = cls.startTime || (cls.classTime ? cls.classTime.split('-')[0]?.trim() : null);
        if (!time) return false;
        const [h, m] = time.split(':');
        const t = new Date(today);
        t.setHours(parseInt(h), parseInt(m), 0);
        return t > now;
      })
      .map(cls => ({
        id: cls._id,
        time: cls.classTime || `${cls.startTime}-${cls.endTime}`,
        class: cls.classId?.className || cls.className,
        section: cls.sectionId?.sectionName,
        subject: cls.subject,
        room: cls.room,
        day: cls.day
      }));

    res.status(200).json({ success: true, data: upcoming, total: upcoming.length });
  } catch (error) {
    console.error('Get upcoming classes error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch upcoming classes', error: error.message });
  }
};
