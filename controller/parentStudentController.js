const ParentStudent = require('../model/ParentStudent');
const Student = require('../model/Student');
const Timetable = require('../model/Timetable');
const Notice = require('../model/Notice');
const FeeCollection = require('../model/FeeCollection');
const Assignment = require('../model/Assignment');
const Attendance = require('../model/Attendance');
const BookIssue = require('../model/BookIssue');
const LiveClass = require('../model/LiveClass');
const VideoClass = require('../model/VideoClass');
const Diary = require('../model/Diary');
const HostelAllocation = require('../model/HostelAllocation');
const HostelMenu = require('../model/HostelMenu');
const HostelService = require('../model/HostelService');
const CheckInOut = require('../model/CheckInOut');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// ─── LOGIN ───────────────────────────────────────────────────────────────────

exports.login = async (req, res) => {
  try {
    const { mobile, password, role } = req.body;
    if (!mobile || !password || !role) {
      return res.status(400).json({ message: 'mobile, password and role are required' });
    }

    const user = await ParentStudent.findOne({ mobile, role }).lean();
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    if (!user.status) return res.status(403).json({ message: 'Account is inactive' });

    const isMatch = await require('bcryptjs').compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { _id: user._id, role: user.role, branch: user.branch, client: user.client, studentId: user.studentId },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    const { password: _, ...userData } = user;
    res.status(200).json({ success: true, message: 'Login successful', token, user: userData });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── AUTH MIDDLEWARE HELPER ───────────────────────────────────────────────────

const getUser = async (userId) => {
  return ParentStudent.findById(userId).lean();
};

// ─── DASHBOARD ───────────────────────────────────────────────────────────────

exports.getDashboard = async (req, res) => {
  try {
    const user = await getUser(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const branch = user.branch;
    const studentId = user.studentId;

    if (user.role === 'warden') {
      const [totalStudents, pendingComplaints, activeServices] = await Promise.all([
        HostelAllocation.countDocuments({ branch, allocationStatus: 'allocated' }),
        HostelService.countDocuments({ branch, status: 'Pending' }),
        HostelService.countDocuments({ branch, status: 'Pending' })
      ]);
      return res.status(200).json({
        success: true,
        data: { role: 'warden', stats: { totalStudents, pendingComplaints, activeServices } }
      });
    }

    if (user.role === 'student' && studentId) {
      const sid = new mongoose.Types.ObjectId(studentId);
      const today = new Date(); today.setHours(0, 0, 0, 0);

      const [student, todayAttendance, pendingFees, issuedBooks, upcomingAssignments] = await Promise.all([
        Student.findById(studentId).populate('class', 'className').populate('section', 'sectionName').lean(),
        Attendance.findOne({ studentId: sid, date: { $gte: today }, type: 'student' }).lean(),
        FeeCollection.countDocuments({ student: sid, status: { $in: ['pending', 'partial'] } }),
        BookIssue.countDocuments({ member: sid, status: { $in: ['issued', 'overdue'] } }),
        Assignment.countDocuments({ branch, dueDate: { $gte: new Date() } })
      ]);

      return res.status(200).json({
        success: true,
        data: {
          role: 'student',
          student: { name: `${user.firstName} ${user.lastName}`, class: student?.class?.className, section: student?.section?.sectionName, rollNumber: user.rollNumber },
          stats: { todayAttendance: todayAttendance?.status || 'Not Marked', pendingFees, issuedBooks, upcomingAssignments }
        }
      });
    }

    if (user.role === 'parent') {
      return res.status(200).json({
        success: true,
        data: { role: 'parent', children: user.children || [], firstName: user.firstName }
      });
    }

    res.status(200).json({ success: true, data: { role: user.role } });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── TIMETABLE ───────────────────────────────────────────────────────────────

exports.getTimetable = async (req, res) => {
  try {
    const user = await getUser(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const studentId = req.query.studentId || user.studentId;
    if (!studentId) return res.status(400).json({ message: 'studentId required' });

    const student = await Student.findById(studentId).lean();
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const timetable = await Timetable.find({ branch: user.branch, classId: student.class, sectionId: student.section })
      .populate('teacherId', 'name email')
      .sort({ day: 1, startTime: 1 })
      .lean();

    // Group by day
    const grouped = {};
    timetable.forEach(t => {
      if (!grouped[t.day]) grouped[t.day] = [];
      grouped[t.day].push({
        time: t.startTime || t.classTime,
        subject: t.subject,
        teacher: t.teacherId?.name || 'TBD',
        room: t.room || ''
      });
    });

    res.status(200).json({ success: true, data: grouped });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── FEE ─────────────────────────────────────────────────────────────────────

exports.getFee = async (req, res) => {
  try {
    const user = await getUser(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const studentId = req.query.studentId || user.studentId;
    if (!studentId) return res.status(400).json({ message: 'studentId required' });

    const sid = new mongoose.Types.ObjectId(studentId);

    const [feeRecords, stats] = await Promise.all([
      FeeCollection.find({ student: sid })
        .sort({ paymentDate: -1 })
        .limit(20)
        .lean(),
      FeeCollection.aggregate([
        { $match: { student: sid } },
        { $group: { _id: '$status', total: { $sum: '$amountPaid' }, balance: { $sum: '$balance' } } }
      ])
    ]);

    const paid = stats.find(s => s._id === 'paid')?.total || 0;
    const pending = stats.find(s => s._id === 'pending')?.balance || 0;
    const partial = stats.find(s => s._id === 'partial')?.balance || 0;

    res.status(200).json({
      success: true,
      data: {
        feeDetails: feeRecords.map(f => ({
          id: f._id,
          description: f.feeType,
          amount: f.amount,
          amountPaid: f.amountPaid,
          balance: f.balance,
          status: f.status === 'paid' ? 'Paid' : f.status === 'partial' ? 'Partial' : 'Pending',
          dueDate: f.paymentDate,
          paidDate: f.status === 'paid' ? f.paymentDate : null,
          paymentMode: f.paymentMode
        })),
        summary: { totalPaid: paid, totalPending: pending + partial }
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── ASSIGNMENTS ─────────────────────────────────────────────────────────────

exports.getAssignments = async (req, res) => {
  try {
    const user = await getUser(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const studentId = req.query.studentId || user.studentId;
    let classId = null;
    if (studentId) {
      const student = await Student.findById(studentId).lean();
      classId = student?.class;
    }

    const query = { branch: user.branch };
    if (classId) query.classId = classId;

    const assignments = await Assignment.find(query)
      .populate('teacherId', 'name')
      .sort({ dueDate: 1 })
      .limit(20)
      .lean();

    res.status(200).json({ success: true, data: assignments });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── NOTICES ─────────────────────────────────────────────────────────────────

exports.getNotices = async (req, res) => {
  try {
    const user = await getUser(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const notices = await Notice.find({
      branch: user.branch,
      isPublished: true,
      expiryDate: { $gte: new Date() }
    })
      .sort({ priority: -1, publishDate: -1 })
      .limit(20)
      .select('title type priority content publishDate expiryDate')
      .lean();

    res.status(200).json({ success: true, data: notices });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── LIBRARY ─────────────────────────────────────────────────────────────────

exports.getLibrary = async (req, res) => {
  try {
    const user = await getUser(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const studentId = req.query.studentId || user.studentId;
    if (!studentId) return res.status(400).json({ message: 'studentId required' });

    const sid = new mongoose.Types.ObjectId(studentId);

    const issues = await BookIssue.find({ member: sid })
      .populate('book', 'title author ISBN category')
      .sort({ issueDate: -1 })
      .lean();

    const books = issues.map(i => ({
      id: i._id,
      bookName: i.book?.title || '',
      author: i.book?.author || '',
      category: i.book?.category || '',
      issueDate: i.issueDate?.toISOString().split('T')[0],
      dueDate: i.dueDate?.toISOString().split('T')[0],
      returnDate: i.returnDate?.toISOString().split('T')[0] || null,
      status: i.status === 'returned' ? 'Returned' : i.status === 'overdue' ? 'Overdue' : 'Issued',
      fine: i.fine || 0
    }));

    res.status(200).json({ success: true, data: books });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── HOSTEL ───────────────────────────────────────────────────────────────────

exports.getHostel = async (req, res) => {
  try {
    const user = await getUser(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const studentId = req.query.studentId || user.studentId;

    const [allocation, menu, entryLogs, services] = await Promise.all([
      studentId ? HostelAllocation.findOne({ studentId: studentId.toString(), allocationStatus: 'allocated' })
        .populate('hostel', 'hostelName contactNo').lean() : null,
      HostelMenu.find({ branch: user.branch }).sort({ day: 1 }).lean(),
      studentId ? CheckInOut.find({ studentId: studentId.toString() }).sort({ timestamp: -1 }).limit(10).lean() : [],
      studentId ? HostelService.find({ studentId: studentId.toString() }).sort({ createdAt: -1 }).limit(10).lean() : []
    ]);

    res.status(200).json({
      success: true,
      data: {
        allocation: allocation ? {
          hostelName: allocation.hostel?.hostelName || '',
          roomNumber: allocation.roomNo,
          monthlyRent: allocation.monthlyRent
        } : null,
        menu,
        entryLogs,
        services
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── LIVE CLASSES ─────────────────────────────────────────────────────────────

exports.getLiveClasses = async (req, res) => {
  try {
    const user = await getUser(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const studentId = req.query.studentId || user.studentId;
    let classId = null;
    if (studentId) {
      const student = await Student.findById(studentId).lean();
      classId = student?.class;
    }

    const query = { branch: user.branch, isPublished: true };
    if (classId) query.classId = classId;

    const classes = await LiveClass.find(query)
      .populate('teacherId', 'name')
      .sort({ scheduledAt: -1 })
      .limit(20)
      .lean();

    res.status(200).json({ success: true, data: classes });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── RECORDED CLASSES ─────────────────────────────────────────────────────────

exports.getRecordedClasses = async (req, res) => {
  try {
    const user = await getUser(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const studentId = req.query.studentId || user.studentId;
    let classId = null;
    if (studentId) {
      const student = await Student.findById(studentId).lean();
      classId = student?.class;
    }

    const query = { branch: user.branch, isPublished: true };
    if (classId) query.classId = classId;

    const videos = await VideoClass.find(query)
      .populate('teacherId', 'name')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    res.status(200).json({ success: true, data: videos });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── E-DIARY ──────────────────────────────────────────────────────────────────

exports.getEDiary = async (req, res) => {
  try {
    const user = await getUser(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const studentId = req.query.studentId || user.studentId;
    let classId = null;
    if (studentId) {
      const student = await Student.findById(studentId).lean();
      classId = student?.class;
    }

    const query = { branch: user.branch };
    if (classId) query.classId = classId;

    const diaries = await Diary.find(query)
      .populate('teacherId', 'name')
      .sort({ date: -1 })
      .limit(20)
      .lean();

    res.status(200).json({ success: true, data: diaries });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── WARDEN SERVICE PANEL ─────────────────────────────────────────────────────

exports.getWardenServices = async (req, res) => {
  try {
    const user = await getUser(req.userId);
    if (!user || user.role !== 'warden') return res.status(403).json({ message: 'Warden access only' });

    const [services, allocations] = await Promise.all([
      HostelService.find({ branch: user.branch }).sort({ createdAt: -1 }).limit(50).lean(),
      HostelAllocation.find({ branch: user.branch, allocationStatus: 'allocated' })
        .select('studentId studentName roomNo').lean()
    ]);

    res.status(200).json({ success: true, data: { services, students: allocations } });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.recordWardenService = async (req, res) => {
  try {
    const user = await getUser(req.userId);
    if (!user || user.role !== 'warden') return res.status(403).json({ message: 'Warden access only' });

    const { studentId, studentName, serviceType, date } = req.body;
    if (!studentId || !serviceType) return res.status(400).json({ message: 'studentId and serviceType required' });

    const service = new HostelService({
      studentId, studentName, serviceType,
      serviceCategory: serviceType,
      date: date || new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString(),
      status: 'Pending',
      branch: user.branch,
      client: user.client,
      createdBy: user._id
    });

    await service.save();
    res.status(201).json({ success: true, message: 'Service recorded', data: service });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── CHANGE PASSWORD ──────────────────────────────────────────────────────────

exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return res.status(400).json({ message: 'Both passwords required' });

    const user = await ParentStudent.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) return res.status(401).json({ message: 'Old password is incorrect' });

    user.password = newPassword;
    await user.save();
    res.status(200).json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── ADMIN: CREATE USER ───────────────────────────────────────────────────────

exports.createUser = async (req, res) => {
  try {
    const { firstName, lastName, mobile, password, role, studentId, rollNumber, class: cls, section, children, wardenId } = req.body;
    if (!firstName || !mobile || !password || !role) return res.status(400).json({ message: 'firstName, mobile, password and role are required' });

    const Admin = require('../model/Admin');
    const admin = await Admin.findById(req.userId).lean();
    if (!admin) return res.status(403).json({ message: 'Access denied' });

    const existing = await ParentStudent.findOne({ mobile, role });
    if (existing) return res.status(400).json({ message: 'User with this mobile and role already exists' });

    const user = new ParentStudent({
      firstName, lastName, mobile, password, role,
      studentId, rollNumber, class: cls, section,
      children: children || [],
      wardenId,
      branch: admin.branch,
      client: admin.client
    });

    await user.save();
    const { password: _, ...userData } = user.toObject();
    res.status(201).json({ success: true, message: 'User created successfully', data: userData });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── ADMIN: GET ALL USERS ─────────────────────────────────────────────────────

exports.getAllUsers = async (req, res) => {
  try {
    const Admin = require('../model/Admin');
    const admin = await Admin.findById(req.userId).lean();
    if (!admin) return res.status(403).json({ message: 'Access denied' });

    const { role } = req.query;
    const query = { branch: admin.branch };
    if (role) query.role = role;

    const users = await ParentStudent.find(query).select('-password').sort({ createdAt: -1 }).lean();
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
