const Attendance = require('../model/Attendance');
const Student = require('../model/Student');
const Staff = require('../model/Staff');
const Admin = require('../model/Admin');

const getBranch = async (userId) => {
  const admin = await Admin.findById(userId).select('branch').lean();
  return admin?.branch || null;
};

// Mark Bulk Attendance (students or staff)
exports.markAttendance = async (req, res) => {
  try {
    const branch = await getBranch(req.userId);
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

    const { type, fromDate, toDate, classId } = req.query;
    if (!type || !fromDate || !toDate) return res.status(400).json({ message: 'type, fromDate, toDate required' });

    const start = new Date(fromDate); start.setHours(0, 0, 0, 0);
    const end = new Date(toDate); end.setHours(23, 59, 59, 999);

    const matchQuery = { branch, type, date: { $gte: start, $lte: end } };
    if (classId) matchQuery.classId = new require('mongoose').Types.ObjectId(classId);

    const [summary, daily] = await Promise.all([
      Attendance.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Attendance.aggregate([
        { $match: matchQuery },
        { $group: { _id: { date: '$date', status: '$status' }, count: { $sum: 1 } } },
        { $sort: { '_id.date': 1 } }
      ])
    ]);

    const summaryMap = { present: 0, absent: 0, late: 0, 'half-day': 0 };
    summary.forEach(s => { summaryMap[s._id] = s.count; });

    res.status(200).json({ summary: summaryMap, daily });
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

    const { page = 1, limit = 50, type, classId, sectionId } = req.query;
    const skip = (page - 1) * limit;

    const query = { branch };
    if (type) query.type = type;
    if (classId) query.classId = classId;
    if (sectionId) query.sectionId = sectionId;

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
