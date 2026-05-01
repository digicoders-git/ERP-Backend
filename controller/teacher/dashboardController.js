const mongoose = require('mongoose');
const Teacher = require('../../model/Teacher');
const Student = require('../../model/Student');
const Assignment = require('../../model/Assignment');
const Attendance = require('../../model/Attendance');
const Notice = require('../../model/Notice');
const Timetable = require('../../model/Timetable');
const SubstituteTeacher = require('../../model/SubstituteTeacher');
const AttendanceSetting = require('../../model/AttendanceSetting');
const { getCache, setCache } = require('../../utils/cache');

const toObjectId = (id) => {
  if (!id) return null;
  if (id instanceof mongoose.Types.ObjectId) return id;
  try {
    return new mongoose.Types.ObjectId(id);
  } catch (e) {
  }
};

exports.getAttendanceSettings = async (req, res) => {
  try {
    const branchId = req.user?.branch;
    if (!branchId) return res.status(400).json({ success: false, message: 'Branch ID missing' });

    let settings = await AttendanceSetting.findOne({ branch: branchId });
    if (!settings) {
      settings = await AttendanceSetting.create({ branch: branchId });
    }
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getDashboardStats = async (req, res) => {
  try {
    const teacherProfileId = req.user?.teacher;
    const teacherId = req.userId || req.user?._id; // The teacherId in Timetable/Assignment refers to Admin ID
    const branch = req.user?.branch;

    if (!teacherProfileId || !branch) {
      return res.status(400).json({ success: false, message: 'Missing required user information' });
    }

    // Check cache first
    const cacheKey = `dashboard:${teacherProfileId}`;
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      return res.status(200).json({ success: true, data: cachedData, fromCache: true });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date().getDay()];

    console.log('Today:', today, 'Day:', dayOfWeek);
    const [teacher, todayClasses, allTimetableEntries, assignmentStats, recentNotices] = await Promise.all([
      Teacher.findById(teacherProfileId)
        .select('name email subjects profileImage assignedClass assignedSection qualification experience')
        .populate('assignedClass', 'className classCode stream')
        .populate('assignedSection', 'sectionName')
        .lean(),
      Timetable.find({ branch, teacherId: teacherProfileId, day: dayOfWeek })
        .select('classId sectionId className classTime startTime endTime subject room')
        .lean(),
      Timetable.find({ branch, teacherId: teacherProfileId })
        .select('classId sectionId')
        .lean(),
      Assignment.aggregate([
        { $match: { branch, teacherId } },
        { $facet: {
            total: [{ $count: 'count' }],
            pending: [{ $match: { dueDate: { $gte: today }, status: 'active' } }, { $count: 'count' }]
          }
        }
      ]),
      Notice.find({ branch, isPublished: true })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('title type publishDate')
        .lean()
    ]);

    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found', teacherId });
    }

    const totalAssignments = assignmentStats[0]?.total[0]?.count || 0;
    const pendingAssignments = assignmentStats[0]?.pending[0]?.count || 0;

    // Get unique classes from ALL timetable entries
    const classMap = new Map();
    
    // Add explicitly assigned class (as class teacher)
    if (teacher?.assignedClass?._id && teacher?.assignedSection?._id) {
      const key = `${teacher.assignedClass._id}-${teacher.assignedSection._id}`;
      classMap.set(key, { classId: teacher.assignedClass._id, sectionId: teacher.assignedSection._id });
    }

    // Add classes from all days
    allTimetableEntries.forEach(e => {
      const cid = e.classId?._id || e.classId;
      const sid = e.sectionId?._id || e.sectionId;
      if (!cid || !sid) return;
      const key = `${cid}-${sid}`;
      if (!classMap.has(key)) classMap.set(key, { classId: cid, sectionId: sid });
    });
    const classes = Array.from(classMap.values());
    const classIds = classes.map(c => c.classId).filter(Boolean);
    const sectionIds = classes.map(c => c.sectionId).filter(Boolean);

    console.log('Unique classes:', classes.length);

    // Student count + today attendance
    let totalStudents = 0;
    let todayAttendance = [];

    if (classIds.length > 0) {
      totalStudents = await Student.countDocuments({ 
        branch, 
        $or: Array.from(classMap.values()).map(c => ({
          class: c.classId,
          section: c.sectionId
        }))
      });

      todayAttendance = await Attendance.aggregate([
        { $match: { 
            branch: toObjectId(branch), 
            date: today, 
            type: 'student', 
            classId: { $in: classIds.map(id => toObjectId(id)).filter(Boolean) } 
          } 
        },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);
    }

    console.log('Total students:', totalStudents, 'Attendance records:', todayAttendance.length);

    const attMap = {};
    todayAttendance.forEach(i => { attMap[i._id] = i.count; });
    const totalMarked = todayAttendance.reduce((s, i) => s + i.count, 0);
    const attendanceRate = totalMarked > 0 ? Math.round(((attMap.present || 0) / totalMarked) * 100) : 0;

    // Upcoming classes
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
        class: cls.classId?.className || (typeof cls.className === 'object' ? cls.className?.className : cls.className) || 'N/A',
        section: cls.sectionId?.sectionName,
        subject: cls.subject,
        room: cls.room || null
      }));

    console.log('Upcoming classes:', upcomingClasses.length);
    console.log('=== Dashboard Stats Complete ===');

    res.status(200).json({
      success: true,
      data: {
        teacher: { 
          id: teacher._id,
          name: teacher.name || 'N/A', 
          email: teacher.email || 'N/A', 
          subjects: teacher.subjects || [],
          profileImage: teacher.profileImage,
          assignedClass: teacher.assignedClass ? {
            id: teacher.assignedClass._id,
            name: teacher.assignedClass.className,
            code: teacher.assignedClass.classCode,
            stream: teacher.assignedClass.stream || [],
            sectionId: teacher.assignedSection?._id
          } : null,
          assignedSection: teacher.assignedSection,
          qualification: teacher.qualification || 'N/A',
          experience: teacher.experience || 0
        },
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
    const teacherProfileId = req.user?.teacher;
    const teacherId = req.userId || req.user?._id;
    const branch = req.user?.branch;

    if (!teacherProfileId || !branch) {
      return res.status(400).json({ success: false, message: 'Missing required user information' });
    }

    // Get assigned class
    const teacher = await Teacher.findById(teacherProfileId)
      .select('assignedClass assignedSection subjects teachingAssignments')
      .populate('assignedClass', 'className classCode stream')
      .populate('assignedSection', 'sectionName')
      .populate('teachingAssignments.class', 'className classCode stream')
      .populate('teachingAssignments.section', 'sectionName')
      .lean();

    const classMap = new Map();

    // Add primary assigned class (Class Teacher role)
    if (teacher?.assignedClass?._id && teacher?.assignedSection?._id) {
      const key = `${teacher.assignedClass._id}-${teacher.assignedSection._id}`;
      const streamName = teacher.assignedClass.stream && teacher.assignedClass.stream.length > 0 
        ? ` (${teacher.assignedClass.stream.join(', ')})` 
        : '';
      classMap.set(key, {
        id: teacher.assignedClass._id,
        name: `${teacher.assignedClass.className}${streamName} ${teacher.assignedSection.sectionName}`.trim(),
        class: `${teacher.assignedClass.className}${streamName}`.trim(),
        section: teacher.assignedSection.sectionName,
        stream: teacher.assignedClass.stream || [],
        subject: teacher.subjects && teacher.subjects.length > 0 ? teacher.subjects.join(', ') : 'N/A',
        room: null,
        classId: teacher.assignedClass._id,
        sectionId: teacher.assignedSection._id,
        code: teacher.assignedClass.classCode || '',
        schedule: [],
        isAssigned: true
      });
    }

    // Add teachingAssignments (Subject teacher role)
    if (teacher?.teachingAssignments && teacher.teachingAssignments.length > 0) {
      teacher.teachingAssignments.forEach(asgn => {
        if (!asgn.class?._id || !asgn.section?._id) return;
        const key = `${asgn.class._id}-${asgn.section._id}`;
        if (!classMap.has(key)) {
          const streamName = asgn.class.stream && asgn.class.stream.length > 0 
            ? ` (${asgn.class.stream.join(', ')})` 
            : '';
          classMap.set(key, {
            id: asgn.class._id,
            name: `${asgn.class.className}${streamName} ${asgn.section.sectionName}`.trim(),
            class: `${asgn.class.className}${streamName}`.trim(),
            section: asgn.section.sectionName,
            stream: asgn.class.stream || [],
            subject: asgn.subjects && asgn.subjects.length > 0 ? asgn.subjects.join(', ') : 'N/A',
            room: null,
            classId: asgn.class._id,
            sectionId: asgn.section._id,
            code: asgn.class.classCode || '',
            schedule: [],
            isAssigned: false
          });
        }
      });
    }

    // Add Substitute Assignments
    const now = new Date();
    const substitutes = await SubstituteTeacher.find({
      branch: branch,
      substituteTeacherId: teacherProfileId,
      startDate: { $lte: now },
      endDate: { $gte: now }
    })
    .populate('classId', 'className stream')
    .populate('sectionId', 'sectionName')
    .lean();

    if (substitutes && substitutes.length > 0) {
      substitutes.forEach(sub => {
        if (!sub.classId || !sub.sectionId) return;
        const key = `${sub.classId._id}-${sub.sectionId._id}`;
        if (!classMap.has(key)) {
          const streamName = sub.classId.stream && sub.classId.stream.length > 0 
            ? ` (${sub.classId.stream.join(', ')})` 
            : '';
          classMap.set(key, {
            id: sub.classId._id,
            name: `${sub.classId.className}${streamName} ${sub.sectionId.sectionName} (Substitute)`.trim(),
            class: `${sub.classId.className}${streamName}`.trim(),
            section: sub.sectionId.sectionName,
            stream: sub.classId.stream || [],
            subject: 'Substitute Role',
            room: null,
            classId: sub.classId._id,
            sectionId: sub.sectionId._id,
            code: sub.classId.classCode || '',
            schedule: [],
            isSubstitute: true
          });
        } else {
          const existing = classMap.get(key);
          existing.isSubstitute = true;
          classMap.set(key, existing);
        }
      });
    }

    // Get timetable classes
    const timetableEntries = await Timetable.find({ branch, teacherId: teacherProfileId })
      .populate('classId', 'className classCode stream')
      .populate('sectionId', 'sectionName')
      .lean();

    timetableEntries.forEach(e => {
      // Skip if classId or sectionId are missing
      if (!e.classId?._id || !e.sectionId?._id) return;
      
      const key = `${e.classId._id}-${e.sectionId._id}`;
      if (!classMap.has(key)) {
        const streamName = e.classId.stream && e.classId.stream.length > 0 
          ? ` (${e.classId.stream.join(', ')})` 
          : '';
        classMap.set(key, {
          id: e.classId._id,
          name: `${e.classId.className}${streamName} ${e.sectionId.sectionName}`.trim(),
          class: `${e.classId.className}${streamName}`.trim(),
          section: e.sectionId.sectionName,
          stream: e.classId.stream || [],
          subject: e.subject || 'N/A',
          room: e.room || null,
          classId: e.classId._id,
          sectionId: e.sectionId._id,
          code: e.classId.classCode || '',
          schedule: [],
          isAssigned: false
        });
      }
      const existingClass = classMap.get(key);
      if (existingClass && e.day && e.classTime) {
        existingClass.schedule.push({
          day: e.day,
          time: e.classTime || `${e.startTime || ''}-${e.endTime || ''}`.trim()
        });
      }
    });

    const classEntries = Array.from(classMap.values()).filter(cls => cls.classId && cls.sectionId);

    // Get substitute classes
    const substituteEntries = await SubstituteTeacher.find({
      branch,
      substituteTeacherId: teacherProfileId,
      startDate: { $lte: now },
      endDate: { $gte: now }
    }).populate('classId', 'className classCode stream')
      .populate('sectionId', 'sectionName')
      .lean();

    substituteEntries.forEach(sub => {
      if (!sub.classId || !sub.sectionId) return;
      const key = `${sub.classId._id}-${sub.sectionId._id}`;
      if (!classMap.has(key)) {
        const streamName = sub.classId.stream && sub.classId.stream.length > 0 
          ? ` (${sub.classId.stream.join(', ')})` : '';
        classEntries.push({
          id: sub.classId._id,
          name: `${sub.classId.className}${streamName} ${sub.sectionId.sectionName}`.trim() + ' (Substitute)',
          class: `${sub.classId.className}${streamName}`.trim(),
          section: sub.sectionId.sectionName,
          stream: sub.classId.stream || [],
          subject: 'Substitute',
          room: null,
          classId: sub.classId._id,
          sectionId: sub.sectionId._id,
          schedule: [],
          isAssigned: false,
          isSubstitute: true
        });
      } else {
        const existing = classEntries.find(c => c.classId.toString() === sub.classId._id.toString() && c.sectionId.toString() === sub.sectionId._id.toString());
        if (existing) existing.isSubstitute = true;
      }
    });

    // Batch all attendance data in one query
    const classKeys = classEntries.map(c => ({ classId: c.classId, sectionId: c.sectionId }));
    const allAttendance = await Attendance.aggregate([
      { $match: { 
          branch: toObjectId(branch), 
          type: 'student',
          $or: classEntries.map(c => ({ 
            classId: toObjectId(c.classId), 
            sectionId: toObjectId(c.sectionId) 
          })).filter(item => item.classId && item.sectionId)
        } 
      },
      { $group: { 
          _id: { classId: '$classId', sectionId: '$sectionId', status: '$status' }, 
          count: { $sum: 1 } 
        } 
      }
    ]);

    // Build attendance map
    const attByClass = {};
    allAttendance.forEach(item => {
      const key = `${item._id.classId}-${item._id.sectionId}`;
      if (!attByClass[key]) attByClass[key] = { present: 0, total: 0 };
      attByClass[key][item._id.status] = item.count;
      attByClass[key].total += item.count;
    });

    // Batch student counts using $or for exact pairs
    const studentCounts = await Student.aggregate([
      { $match: { 
          branch: toObjectId(branch), 
          $or: classEntries.map(c => ({ 
            class: toObjectId(c.classId), 
            section: toObjectId(c.sectionId) 
          })).filter(item => item.class && item.section)
        } 
      },
      { $group: { 
          _id: { class: '$class', section: '$section' }, 
          count: { $sum: 1 } 
        } 
      }
    ]);

    // Build student count map with string keys
    const studentByClass = {};
    studentCounts.forEach(item => {
      const key = `${item._id.class.toString()}-${item._id.section.toString()}`;
      studentByClass[key] = item.count;
    });

    // Enrich classes with data
    const enriched = classEntries.map(cls => {
      const key = `${cls.classId.toString()}-${cls.sectionId.toString()}`;
      const att = attByClass[key] || { present: 0, total: 0 };
      const studentCount = studentByClass[key] || 0;
      return {
        ...cls,
        students: studentCount,
        attendance: att.total > 0 ? Math.round((att.present / att.total) * 100) : 0
      };
    });
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
    const teacherProfileId = req.user?.teacher;
    const teacherId = req.userId || req.user?._id;
    const branch = req.user?.branch;
    const { limit = 10 } = req.query;

    const [recentAssignments, recentNotices] = await Promise.all([
      Assignment.find({ branch, teacherId })
        .sort({ createdAt: -1 }).limit(5)
        .select('title class section createdAt')
        .populate('class', 'className')
        .populate('section', 'sectionName')
        .lean(),
      Notice.find({ branch, createdBy: teacherId })
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
    const teacherProfileId = req.user?.teacher;
    const teacherId = req.userId || req.user?._id;
    const branch = req.user?.branch;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date().getDay()];

    const todayClasses = await Timetable.find({ branch, teacherId: teacherProfileId, day: dayOfWeek })
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
        class: cls.classId?.className || (typeof cls.className === 'object' ? cls.className?.className : cls.className) || 'N/A',
        section: cls.sectionId?.sectionName,
        subject: cls.subject,
        room: cls.room || null,
        day: cls.day
      }));

    res.status(200).json({ success: true, data: upcoming, total: upcoming.length });
  } catch (error) {
    console.error('Get upcoming classes error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch upcoming classes', error: error.message });
  }
};
