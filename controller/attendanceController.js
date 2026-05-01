const Attendance = require('../model/Attendance');
const Student = require('../model/Student');
const Staff = require('../model/Staff');
const Admin = require('../model/Admin');
const Class = require('../model/Class');
const mongoose = require('mongoose');

const getBranch = async (userId) => {
  // Try Admin first
  let user = await Admin.findById(userId).select('branch').lean();
  if (user?.branch) return user.branch;
  
  // Try Staff if not found in Admin
  user = await Staff.findById(userId).select('branch').lean();
  return user?.branch || null;
};

// Mark Bulk Attendance (students or staff)
exports.markAttendance = async (req, res) => {
  try {
    let adminUser = await Admin.findById(req.userId).lean();
    let staffUser = !adminUser ? await Staff.findById(req.userId).lean() : null;
    const branch = adminUser?.branch || staffUser?.branch;

    if (!branch) return res.status(403).json({ message: 'Access denied' });

    let { date, type, records, attendance, classId, sectionId, class: className, section: sectionName } = req.body;
    
    // Support both classId and class field names
    classId = classId || className;
    sectionId = sectionId || sectionName;
    
    // Support both records and attendance field names - prioritize attendance if both exist
    if (attendance && Array.isArray(attendance)) {
      records = attendance;
    } else if (records && typeof records === 'string') {
      records = attendance || [];
    }
    
    if (!date || !type) {
      return res.status(400).json({ message: 'Date and type are required' });
    }
    
    // Convert records to array if it's an object
    if (records && typeof records === 'object' && !Array.isArray(records)) {
      records = Object.values(records);
    }
    
    if (!records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ 
        message: 'Records must be a non-empty array'
      });
    }

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    // If user is a teacher, verify permissions
    if (adminUser && adminUser.role === 'teacherAdmin' && type === 'student') {
      const teacherId = adminUser.teacher;
      const Teacher = require('../model/Teacher');
      const teacherProfile = await Teacher.findById(teacherId).lean();
      
      let isAllowed = false;
      if (teacherProfile && teacherProfile.isClassTeacher && 
          teacherProfile.assignedClass?.toString() === classId?.toString() &&
          (!sectionId || teacherProfile.assignedSection?.toString() === sectionId?.toString())) {
        isAllowed = true;
      } else {
        // Check if substitute
        const SubstituteTeacher = require('../model/SubstituteTeacher');
        const isSubstitute = await SubstituteTeacher.findOne({
          substituteTeacherId: teacherId,
          classId,
          sectionId: sectionId || { $exists: true },
          startDate: { $lte: attendanceDate },
          endDate: { $gte: attendanceDate }
        });
        if (isSubstitute) isAllowed = true;
      }

      if (!isAllowed) {
        return res.status(403).json({ message: 'Not authorized to mark attendance for this class' });
      }
    }

    // Delete existing attendance for same date/type/class to allow re-marking
    const deleteQuery = { branch, date: attendanceDate, type };
    if (type === 'student' && classId) { 
      deleteQuery.classId = classId; 
      if (sectionId) deleteQuery.sectionId = sectionId; 
    }

    await Attendance.deleteMany(deleteQuery);

    const docs = records.map(r => ({
      branch,
      date: attendanceDate,
      type,
      ...(type === 'student' ? { studentId: r.studentId || r.student, classId, sectionId } : { staffId: r.staffId || r.staff }),
      status: r.status,
      remark: r.remark || '',
      markedBy: req.userId
    }));

    await Attendance.insertMany(docs, { ordered: false });
    res.status(201).json({ message: `${docs.length} attendance records saved` });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Attendance by Date + Type (fast lean)
exports.getAttendanceByDate = async (req, res) => {
  try {
    const branch = await getBranch(req.userId);
    if (!branch) return res.status(403).json({ message: 'Access denied' });

    const { date, type, classId, sectionId } = req.query;
    if (!date || !type) return res.status(400).json({ message: 'date and type required' });

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const query = { branch, date: attendanceDate, type };
    if (classId) query.classId = classId;
    if (sectionId) query.sectionId = sectionId;

    const attendance = await Attendance.find(query)
      .populate('studentId', 'firstName lastName profileImage')
      .populate('staffId', 'name profileImage')
      .populate('classId', 'className')
      .populate('sectionId', 'sectionName')
      .lean();

    res.status(200).json({ attendance });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Attendance Report (date range, fast aggregation)
exports.getAttendanceReport = async (req, res) => {
  try {
    const branch = await getBranch(req.userId);
    if (!branch) return res.status(403).json({ message: 'Access denied' });

    const { type, fromDate, toDate, startDate, endDate, classId } = req.query;
    const finalFrom = fromDate || startDate;
    const finalTo = toDate || endDate;

    if (!type || !finalFrom || !finalTo) return res.status(400).json({ message: 'type, fromDate, toDate required' });

    const start = new Date(finalFrom); start.setHours(0, 0, 0, 0);
    const end = new Date(finalTo); end.setHours(23, 59, 59, 999);

    const matchQuery = { branch, type, date: { $gte: start, $lte: end } };
    if (classId && mongoose.Types.ObjectId.isValid(classId)) {
      matchQuery.classId = new mongoose.Types.ObjectId(classId);
    }

    const [summary, daily, details, classTotals] = await Promise.all([
      Attendance.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Attendance.aggregate([
        { $match: matchQuery },
        { $group: { _id: { date: '$date', status: '$status' }, count: { $sum: 1 } } },
        { $sort: { '_id.date': 1 } }
      ]),
      Attendance.find(matchQuery)
        .populate('studentId', 'firstName lastName admissionNumber rollNumber')
        .populate('classId', 'className')
        .populate('sectionId', 'sectionName')
        .sort({ date: -1 })
        .limit(1000)
        .lean(),
      Student.aggregate([
        { $match: { branch, admissionStatus: 'confirmed' } },
        { $group: { _id: '$class', total: { $sum: 1 } } }
      ])
    ]);

    const summaryMap = { present: 0, absent: 0, late: 0, leave: 0, 'half-day': 0 };
    summary.forEach(s => { summaryMap[s._id] = s.count; });

    // Build class summary (Present vs Total)
    const classSummaryRaw = await Attendance.aggregate([
      { $match: { ...matchQuery, status: 'present' } },
      { $group: { _id: '$classId', present: { $sum: 1 } } }
    ]);

    // Populate Class Names for the summary
    const classes = await Class.find({ branch }).select('className').lean();
    
    const classSummary = classes.map(c => {
      const totals = classTotals.find(t => t._id?.toString() === c._id.toString());
      const attendance = classSummaryRaw.find(a => a._id?.toString() === c._id.toString());
      return {
        _id: c._id,
        className: c.className,
        totalStudents: totals?.total || 0,
        presentCount: attendance?.present || 0
      };
    });

    // Build timeline data for chart
    const timelineMap = {};
    daily.forEach(d => {
      const dateStr = new Date(d._id.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      if (!timelineMap[dateStr]) {
        timelineMap[dateStr] = { date: dateStr, present: 0, absent: 0 };
      }
      if (d._id.status === 'present') timelineMap[dateStr].present = d.count;
      if (d._id.status === 'absent') timelineMap[dateStr].absent = d.count;
    });
    const timeline = Object.values(timelineMap);

    res.status(200).json({ 
      summary: summaryMap, 
      timeline,
      details,
      classSummary 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Students list for attendance marking
exports.getStudentsForAttendance = async (req, res) => {
  try {
    const branch = await getBranch(req.userId);
    if (!branch) return res.status(403).json({ message: 'Access denied' });

    const { classId, sectionId } = req.query;
    const query = { branch, admissionStatus: 'confirmed' };
    if (classId) query.class = classId;
    if (sectionId) query.section = sectionId;

    const students = await Student.find(query)
      .select('firstName lastName profileImage')
      .populate('class', 'className')
      .populate('section', 'sectionName')
      .lean();

    res.status(200).json({ students });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Staff list for attendance marking
exports.getStaffForAttendance = async (req, res) => {
  try {
    const branch = await getBranch(req.userId);
    if (!branch) return res.status(403).json({ message: 'Access denied' });

    const staff = await Staff.find({ branch, status: true })
      .select('name profileImage')
      .lean();

    res.status(200).json({ staff });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Attendance Records
exports.getAllAttendance = async (req, res) => {
  try {
    const branch = await getBranch(req.userId);
    if (!branch) return res.status(403).json({ message: 'Access denied' });

    const { page = 1, limit = 50, type, classId, sectionId, status } = req.query;
    const skip = (page - 1) * limit;

    const query = { branch };
    if (type) query.type = type;
    if (classId) query.classId = classId;
    if (sectionId) query.sectionId = sectionId;
    if (status) query.status = status;

    const attendance = await Attendance.find(query)
      .populate('studentId', 'firstName lastName')
      .populate('staffId', 'name')
      .populate('classId', 'className')
      .populate('sectionId', 'sectionName')
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Attendance.countDocuments(query);

    res.status(200).json({ 
      attendance,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
// Delete Attendance Record
exports.deleteAttendance = async (req, res) => {
  try {
    const branch = await getBranch(req.userId);
    if (!branch) return res.status(403).json({ message: 'Access denied' });

    const { id } = req.params;
    const result = await Attendance.findOneAndDelete({ _id: id, branch });

    if (!result) {
      return res.status(404).json({ message: 'Record not found' });
    }

    res.status(200).json({ message: 'Attendance record deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Single Attendance Record (Live Status)
exports.updateAttendance = async (req, res) => {
  try {
    const branch = await getBranch(req.userId);
    if (!branch) return res.status(403).json({ message: 'Access denied' });

    const { id } = req.params;
    const { status, remark } = req.body;

    const record = await Attendance.findOne({ _id: id, branch });
    if (!record) return res.status(404).json({ message: 'Record not found' });

    record.status = status || record.status;
    record.remark = remark !== undefined ? remark : record.remark;
    
    // Check if updated by Admin (override)
    const admin = await Admin.findById(req.userId);
    if (admin) {
      record.overriddenBy = req.userId;
    }

    await record.save();
    res.status(200).json({ message: 'Attendance updated successfully', record });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Sync Biometric Data
exports.syncBiometric = async (req, res) => {
  try {
    const branch = await getBranch(req.userId);
    if (!branch) return res.status(403).json({ message: 'Access denied' });

    const { records, type } = req.body; // records: [{ id, timeIn, date }]
    if (!records || !Array.isArray(records)) {
      return res.status(400).json({ message: 'Invalid records format' });
    }

    let synced = 0;
    for (const r of records) {
      const attendanceDate = new Date(r.date);
      attendanceDate.setHours(0, 0, 0, 0);

      const query = { branch, date: attendanceDate, type };
      if (type === 'student') query.studentId = r.id;
      else query.staffId = r.id;

      let existing = await Attendance.findOne(query);

      if (existing) {
        // If manual exists and no overriddenBy, Biometric can update timeIn and status
        if (!existing.overriddenBy) {
          existing.timeIn = r.timeIn;
          existing.source = 'biometric';
          existing.status = 'present'; // Can add late logic based on timeIn
          await existing.save();
          synced++;
        }
      } else {
        // Create new biometric record
        await Attendance.create({
          branch,
          date: attendanceDate,
          type,
          [type === 'student' ? 'studentId' : 'staffId']: r.id,
          status: 'present',
          source: 'biometric',
          timeIn: r.timeIn
        });
        synced++;
      }
    }

    res.status(200).json({ message: `Biometric sync completed: ${synced} records updated` });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const SubstituteTeacher = require('../model/SubstituteTeacher');

// Assign Substitute Teacher
exports.assignSubstitute = async (req, res) => {
  try {
    const branch = await getBranch(req.userId);
    if (!branch) return res.status(403).json({ message: 'Access denied' });

    const { classId, sectionId, substituteTeacherId, startDate, endDate, reason } = req.body;

    if (!classId || !sectionId || !substituteTeacherId || !startDate || !endDate) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const sub = await SubstituteTeacher.create({
      branch,
      classId,
      sectionId,
      substituteTeacherId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason,
      assignedBy: req.userId
    });

    res.status(201).json({ message: 'Substitute assigned successfully', substitute: sub });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Substitute Assignments
exports.getSubstitutes = async (req, res) => {
  try {
    const branch = await getBranch(req.userId);
    if (!branch) return res.status(403).json({ message: 'Access denied' });

    const { classId, sectionId, active } = req.query;
    const query = { branch };

    if (classId) query.classId = classId;
    if (sectionId) query.sectionId = sectionId;

    if (active === 'true') {
      const now = new Date();
      query.startDate = { $lte: now };
      query.endDate = { $gte: now };
    }

    const substitutes = await SubstituteTeacher.find(query)
      .populate('substituteTeacherId', 'name email profileImage')
      .populate('classId', 'className')
      .populate('sectionId', 'sectionName')
      .populate('assignedBy', 'email name')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ substitutes });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

