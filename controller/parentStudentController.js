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

// ─── ATTENDANCE HISTORY WITH ANALYTICS ────────────────────────────────────────

exports.getAttendanceHistory = async (req, res) => {
  try {
    const user = await getUser(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const studentId = req.query.studentId || user.studentId;
    if (!studentId) return res.status(400).json({ message: 'studentId required' });

    const { startDate, endDate, month } = req.query;
    const sid = new mongoose.Types.ObjectId(studentId);

    // Date range
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = { $gte: new Date(startDate), $lte: new Date(endDate) };
    } else if (month) {
      const [year, monthNum] = month.split('-');
      const start = new Date(year, monthNum - 1, 1);
      const end = new Date(year, monthNum, 0);
      dateFilter = { $gte: start, $lte: end };
    } else {
      // Last 30 days
      const start = new Date();
      start.setDate(start.getDate() - 30);
      dateFilter = { $gte: start };
    }

    const [records, stats] = await Promise.all([
      Attendance.find({ studentId: sid, type: 'student', date: dateFilter })
        .sort({ date: -1 })
        .select('date status remarks')
        .lean(),
      Attendance.aggregate([
        { $match: { studentId: sid, type: 'student', date: dateFilter } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);

    const statusMap = {};
    stats.forEach(s => { statusMap[s._id] = s.count; });
    const total = stats.reduce((sum, s) => sum + s.count, 0);
    const present = statusMap.present || 0;
    const absent = statusMap.absent || 0;
    const late = statusMap.late || 0;
    const attendancePercentage = total > 0 ? Math.round((present / total) * 100) : 0;

    res.status(200).json({
      success: true,
      data: {
        records: records.map(r => ({
          date: r.date.toISOString().split('T')[0],
          status: r.status,
          remarks: r.remarks || ''
        })),
        analytics: {
          totalDays: total,
          present,
          absent,
          late,
          attendancePercentage,
          status: attendancePercentage >= 75 ? 'Good' : attendancePercentage >= 60 ? 'Average' : 'Poor'
        }
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── EXAM RESULTS & PERFORMANCE ───────────────────────────────────────────────

exports.getExamResults = async (req, res) => {
  try {
    const user = await getUser(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const studentId = req.query.studentId || user.studentId;
    if (!studentId) return res.status(400).json({ message: 'studentId required' });

    const ExamSchedule = require('../model/ExamSchedule');
    const sid = new mongoose.Types.ObjectId(studentId);

    const student = await Student.findById(studentId).select('class section').lean();
    if (!student) return res.status(404).json({ message: 'Student not found' });

    // Get exams with results
    const exams = await ExamSchedule.find({
      branch: user.branch,
      class: student.class,
      section: student.section,
      'results.studentId': sid
    })
      .sort({ examDate: -1 })
      .select('examName subject examDate totalMarks results')
      .lean();

    const results = exams.map(exam => {
      const studentResult = exam.results?.find(r => r.studentId?.toString() === studentId);
      return {
        examId: exam._id,
        examName: exam.examName,
        subject: exam.subject,
        examDate: exam.examDate,
        totalMarks: exam.totalMarks,
        obtainedMarks: studentResult?.marksObtained || 0,
        grade: studentResult?.grade || 'N/A',
        percentage: exam.totalMarks > 0 ? Math.round((studentResult?.marksObtained || 0) / exam.totalMarks * 100) : 0,
        remarks: studentResult?.remarks || ''
      };
    });

    // Calculate overall performance
    const totalExams = results.length;
    const avgPercentage = totalExams > 0 
      ? Math.round(results.reduce((sum, r) => sum + r.percentage, 0) / totalExams) 
      : 0;

    res.status(200).json({
      success: true,
      data: {
        results,
        performance: {
          totalExams,
          averagePercentage: avgPercentage,
          status: avgPercentage >= 75 ? 'Excellent' : avgPercentage >= 60 ? 'Good' : avgPercentage >= 40 ? 'Average' : 'Needs Improvement'
        }
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── TRANSPORT TRACKING ───────────────────────────────────────────────────────

exports.getTransportInfo = async (req, res) => {
  try {
    const user = await getUser(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const studentId = req.query.studentId || user.studentId;
    if (!studentId) return res.status(400).json({ message: 'studentId required' });

    const TransportAllocation = require('../model/TransportAllocation');
    const Route = require('../model/Route');
    const Vehicle = require('../model/Vehicle');
    const Driver = require('../model/Driver');

    const allocation = await TransportAllocation.findOne({ 
      studentId: studentId.toString(), 
      status: 'active' 
    }).lean();

    if (!allocation) {
      return res.status(200).json({ 
        success: true, 
        data: { allocated: false, message: 'No transport allocated' } 
      });
    }

    const [route, vehicle, driver] = await Promise.all([
      Route.findById(allocation.routeId).lean(),
      Vehicle.findById(allocation.vehicleId).lean(),
      Driver.findById(allocation.driverId).lean()
    ]);

    res.status(200).json({
      success: true,
      data: {
        allocated: true,
        route: {
          name: route?.routeName || 'N/A',
          pickupPoint: allocation.pickupPoint || 'N/A',
          dropPoint: allocation.dropPoint || 'N/A',
          pickupTime: allocation.pickupTime || 'N/A',
          dropTime: allocation.dropTime || 'N/A'
        },
        vehicle: {
          number: vehicle?.vehicleNumber || 'N/A',
          type: vehicle?.vehicleType || 'N/A',
          capacity: vehicle?.capacity || 0
        },
        driver: {
          name: driver?.name || 'N/A',
          mobile: driver?.mobile || 'N/A',
          licenseNumber: driver?.licenseNumber || 'N/A'
        },
        fee: allocation.monthlyFee || 0
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── COMMUNICATION WITH TEACHERS ──────────────────────────────────────────────

exports.sendMessageToTeacher = async (req, res) => {
  try {
    const user = await getUser(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { teacherId, subject, message, studentId } = req.body;
    if (!teacherId || !subject || !message) {
      return res.status(400).json({ message: 'teacherId, subject and message are required' });
    }

    const Communication = require('../model/Notification');
    
    const comm = new Communication({
      recipientId: teacherId,
      recipientType: 'teacher',
      senderId: user._id,
      senderType: user.role,
      studentId: studentId || user.studentId,
      subject,
      message,
      type: 'message',
      status: 'unread',
      branch: user.branch,
      client: user.client,
      createdAt: new Date()
    });

    await comm.save();
    res.status(201).json({ success: true, message: 'Message sent successfully', data: comm });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const user = await getUser(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const Notification = require('../model/Notification');
    
    const messages = await Notification.find({
      $or: [
        { recipientId: user._id },
        { senderId: user._id }
      ],
      type: 'message'
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── PAYMENT INITIATION ───────────────────────────────────────────────────────

exports.initiateFeePayment = async (req, res) => {
  try {
    const user = await getUser(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { feeCollectionId, amount, paymentMethod } = req.body;
    if (!feeCollectionId || !amount) {
      return res.status(400).json({ message: 'feeCollectionId and amount are required' });
    }

    const feeRecord = await FeeCollection.findById(feeCollectionId);
    if (!feeRecord) return res.status(404).json({ message: 'Fee record not found' });

    // Create payment intent (placeholder for payment gateway integration)
    const paymentIntent = {
      id: `pi_${Date.now()}`,
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      status: 'pending',
      feeCollectionId,
      studentId: feeRecord.student,
      paymentMethod: paymentMethod || 'online',
      createdAt: new Date()
    };

    // In production, integrate with Razorpay/Stripe/PayU
    // const razorpay = new Razorpay({ key_id: process.env.RAZORPAY_KEY, key_secret: process.env.RAZORPAY_SECRET });
    // const order = await razorpay.orders.create({ amount: amount * 100, currency: 'INR', receipt: feeCollectionId });

    res.status(200).json({
      success: true,
      message: 'Payment initiated',
      data: {
        paymentIntent,
        // In production, return payment gateway order details
        // orderId: order.id,
        // key: process.env.RAZORPAY_KEY,
        redirectUrl: `/payment/confirm?intent=${paymentIntent.id}`
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.confirmPayment = async (req, res) => {
  try {
    const { paymentIntentId, paymentId, signature } = req.body;
    if (!paymentIntentId) return res.status(400).json({ message: 'paymentIntentId required' });

    // Verify payment signature (Razorpay example)
    // const crypto = require('crypto');
    // const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_SECRET)
    //   .update(orderId + '|' + paymentId).digest('hex');
    // if (expectedSignature !== signature) return res.status(400).json({ message: 'Invalid signature' });

    // Update fee collection record
    // const feeRecord = await FeeCollection.findById(feeCollectionId);
    // feeRecord.amountPaid += amount;
    // feeRecord.balance -= amount;
    // feeRecord.status = feeRecord.balance === 0 ? 'paid' : 'partial';
    // feeRecord.paymentDate = new Date();
    // feeRecord.paymentMode = 'online';
    // feeRecord.transactionId = paymentId;
    // await feeRecord.save();

    res.status(200).json({
      success: true,
      message: 'Payment confirmed successfully',
      data: { paymentIntentId, status: 'success' }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── STUDENT PROFILE ──────────────────────────────────────────────────────────

exports.getStudentProfile = async (req, res) => {
  try {
    const user = await getUser(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const studentId = req.query.studentId || user.studentId;
    if (!studentId) return res.status(400).json({ message: 'studentId required' });

    const student = await Student.findById(studentId)
      .populate('class', 'className')
      .populate('section', 'sectionName')
      .populate('branch', 'branchName')
      .lean();

    if (!student) return res.status(404).json({ message: 'Student not found' });

    res.status(200).json({
      success: true,
      data: {
        personalInfo: {
          name: `${student.firstName} ${student.lastName}`,
          rollNumber: student.rollNumber,
          admissionNumber: student.admissionNumber,
          dateOfBirth: student.dateOfBirth,
          gender: student.gender,
          bloodGroup: student.bloodGroup,
          email: student.email,
          mobile: student.mobile,
          profileImage: student.profileImage
        },
        academicInfo: {
          class: student.class?.className || 'N/A',
          section: student.section?.sectionName || 'N/A',
          branch: student.branch?.branchName || 'N/A',
          admissionDate: student.admissionDate,
          status: student.status
        },
        parentInfo: {
          fatherName: student.fatherName,
          fatherMobile: student.fatherMobile,
          motherName: student.motherName,
          motherMobile: student.motherMobile,
          guardianName: student.guardianName,
          guardianMobile: student.guardianMobile
        },
        address: {
          currentAddress: student.currentAddress,
          permanentAddress: student.permanentAddress,
          city: student.city,
          state: student.state,
          pincode: student.pincode
        }
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── LEAVE APPLICATION ────────────────────────────────────────────────────────

exports.applyLeave = async (req, res) => {
  try {
    const user = await getUser(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { studentId, leaveType, startDate, endDate, reason } = req.body;
    if (!leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const Leave = require('../model/Leave');
    const sid = studentId || user.studentId;

    const leave = new Leave({
      studentId: sid,
      leaveType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason,
      status: 'pending',
      appliedBy: user._id,
      branch: user.branch,
      client: user.client,
      createdAt: new Date()
    });

    await leave.save();
    res.status(201).json({ success: true, message: 'Leave application submitted', data: leave });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getLeaveHistory = async (req, res) => {
  try {
    const user = await getUser(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const studentId = req.query.studentId || user.studentId;
    if (!studentId) return res.status(400).json({ message: 'studentId required' });

    const Leave = require('../model/Leave');
    
    const leaves = await Leave.find({ studentId })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, data: leaves });
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
