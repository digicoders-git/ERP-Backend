const ParentStudent = require('../model/ParentStudent');
const Student = require('../model/Student');
const Timetable = require('../model/Timetable');
const Notice = require('../model/Notice');
const FeeCollection = require('../model/FeeCollection');
const Assignment = require('../model/Assignment');
const Attendance = require('../model/Attendance');
const BookIssue = require('../model/BookIssue');
const AssignmentSubmission = require('../model/AssignmentSubmission');
const LiveClass = require('../model/LiveClass');
const VideoClass = require('../model/VideoClass');
const Diary = require('../model/Diary');
const HostelAllocation = require('../model/HostelAllocation');
const HostelMenu = require('../model/HostelMenu');
const HostelService = require('../model/HostelService');
const CheckInOut = require('../model/CheckInOut');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Event = require('../model/Event');
const Book = require('../model/Book');
const BookRequest = require('../model/BookRequest');

// ─── LOGIN ───────────────────────────────────────────────────────────────────

exports.login = async (req, res) => {
  try {
    const { mobile, password, role, admissionNumber, dob } = req.body;

    // ─── Student Login via Admission Number & DOB ──────────────────────────
    if (role === 'student' && admissionNumber && dob) {
      const student = await Student.findOne({ admissionNumber }).lean();
      if (!student) return res.status(401).json({ message: 'Invalid Enrollment Number' });

      // Verify DOB (Normalize both to YYYY-MM-DD for comparison)
      const studentDob = new Date(student.dob).toISOString().split('T')[0];
      const inputDob = new Date(dob).toISOString().split('T')[0];

      if (studentDob !== inputDob) {
        return res.status(401).json({ message: 'Invalid Date of Birth' });
      }

      // Find or Create ParentStudent record
      let user = await ParentStudent.findOne({ studentId: student._id, role: 'student' }).lean();

      if (!user) {
        // Create user record if identity is verified via Student model
        const newUser = new ParentStudent({
          firstName: student.firstName,
          lastName: student.lastName,
          mobile: student.phone || student.mobile || '0000000000',
          password: await require('bcryptjs').hash('student_default_123', 10),
          role: 'student',
          studentId: student._id,
          rollNumber: student.rollNumber,
          branch: student.branch,
          client: student.client,
          status: true
        });
        const saved = await newUser.save();
        user = saved.toObject();
      }

      if (!user.status) return res.status(403).json({ message: 'Account is inactive' });

      const token = jwt.sign(
        { _id: user._id, role: user.role, branch: user.branch, client: user.client, studentId: user.studentId },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );

      const { password: _, ...userData } = user;
      return res.status(200).json({ success: true, message: 'Login successful', token, user: userData });
    }

    // ─── Standard Login via Mobile & Password ──────────────────────────────
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

// ─── AUTH HELPERS ─────────────────────────────────────────────────────────────

const getUser = async (userId) => {
  return ParentStudent.findById(userId).lean();
};

const validateStudentAccess = (user, requestedStudentId) => {
  if (!user) return null;
  if (user.role === 'student') return user.studentId?.toString();
  if (user.role === 'parent') {
    if (!user.children || user.children.length === 0) return null;
    if (requestedStudentId) {
      const isMine = user.children.some(c => (c.studentId || c.id)?.toString() === requestedStudentId.toString());
      return isMine ? requestedStudentId : user.children[0].studentId?.toString() || user.children[0].id?.toString();
    }
    return user.children[0].studentId?.toString() || user.children[0].id?.toString();
  }
  return requestedStudentId; // Warden
};

// ─── DASHBOARD ───────────────────────────────────────────────────────────────

exports.getDashboard = async (req, res) => {
  try {
    const user = await getUser(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const studentId = validateStudentAccess(user, req.query.studentId);
    const branch = user.branch;

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

    if (studentId) {
      // Fetch student first to get class/section IDs for subsequent queries
      const student = await Student.findById(studentId).populate('class', 'className').populate('section', 'sectionName').lean();
      if (!student) return res.status(404).json({ message: 'Student master record not found' });

      const sid = new mongoose.Types.ObjectId(studentId);
      const today = new Date(); today.setHours(0, 0, 0, 0);

      const [todayAttendance, pendingFees, issuedBooks, upcomingAssignments, totalAttendance, upcomingEvents, totalAttendanceHistory, recentPayments] = await Promise.all([
        Attendance.findOne({ studentId: sid, date: { $gte: today }, type: 'student' }).lean(),
        FeeCollection.aggregate([
          { $match: { student: sid, status: { $in: ['pending', 'partial'] } } },
          { $group: { _id: null, total: { $sum: '$balance' } } }
        ]),
        BookIssue.countDocuments({ member: sid, status: { $in: ['issued', 'overdue'] } }),
        Assignment.countDocuments({ 
          branch, 
          class: student.class?._id, 
          status: 'active', 
          dueDate: { $gte: new Date() } 
        }),
        Attendance.aggregate([
          { $match: { studentId: sid, type: 'student' } },
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),
        Event.find({ branch, status: 'upcoming', date: { $gte: new Date() } }).sort({ date: 1 }).limit(5).lean(),
        Attendance.find({ studentId: sid }).sort({ date: -1 }).limit(3).lean(),
        FeeCollection.find({ student: sid, status: 'paid' }).sort({ paymentDate: -1 }).limit(2).lean()
      ]);

      const attStats = {};
      totalAttendance.forEach(a => { attStats[a._id] = a.count; });
      const totalAttDays = totalAttendance.reduce((sum, a) => sum + a.count, 0);
      const attPercentage = totalAttDays > 0 ? Math.round(((attStats.present || 0) / totalAttDays) * 100) : 0;

      const recentActivities = [];
      
      // Combine attendance into activities
      totalAttendanceHistory.forEach(att => {
        recentActivities.push({
          title: `Attendance marked as ${att.status}`,
          time: new Date(att.date).toLocaleDateString(),
          type: 'attendance',
          date: att.date
        });
      });

      // Combine payments
      recentPayments.forEach(pay => {
        recentActivities.push({
          title: `Fee payment of ₹${pay.amountPaid} successful`,
          time: new Date(pay.paymentDate).toLocaleDateString(),
          type: 'payment',
          date: pay.paymentDate
        });
      });

      // Sort by date desc
      recentActivities.sort((a, b) => new Date(b.date) - new Date(a.date));

      return res.status(200).json({
        success: true,
        data: {
          role: user.role,
          student: { 
            name: `${student?.firstName} ${student?.lastName}`, 
            class: student?.class?.className || user.class, 
            section: student?.section?.sectionName || user.section, 
            rollNumber: student?.rollNumber || user.rollNumber,
            admissionNumber: student?.admissionNumber
          },
          stats: { 
            todayAttendance: todayAttendance?.status || 'Not Marked', 
            pendingFees: pendingFees[0]?.total || 0, 
            issuedBooks, 
            upcomingAssignments,
            attendancePercentage: attPercentage
          },
          upcomingEvents: upcomingEvents.map(e => ({
            title: e.title,
            date: new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            time: e.startTime || 'TBD',
            type: e.type.toLowerCase()
          })),
          recentActivities: recentActivities.slice(0, 5),
          children: user.role === 'parent' ? user.children : []
        }
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

    const studentId = validateStudentAccess(user, req.query.studentId);
    if (!studentId) return res.status(403).json({ message: 'Access denied' });

    const student = await Student.findById(studentId)
      .populate('class', 'className _id')
      .populate('section', 'sectionName _id')
      .lean();
    if (!student) return res.status(404).json({ message: 'Student not found' });

    // Get student's class and section IDs
    const sClassId = student.class?._id?.toString();
    const sSectionId = student.section?._id?.toString();
    const sBranch = user.branch?.toString();

    if (!sClassId) {
      return res.status(200).json({ 
        success: true, 
        data: {
          'Monday': [], 'Tuesday': [], 'Wednesday': [], 'Thursday': [], 'Friday': [], 'Saturday': [], 'Sunday': []
        },
        _stats: { total: 0, final: 0, message: 'Student class not assigned' }
      });
    }

    // Query timetable with proper filters
    const timetables = await Timetable.find({
      branch: sBranch,
      classId: sClassId,
      ...(sSectionId && { sectionId: sSectionId })
    })
      .populate('teacherId', 'name email')
      .sort({ day: 1, startTime: 1 })
      .lean();

    const grouped = {
      'Monday': [], 'Tuesday': [], 'Wednesday': [], 'Thursday': [], 'Friday': [], 'Saturday': [], 'Sunday': []
    };

    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    timetables.forEach(t => {
      if (!t.day) return;
      
      // Normalize day name
      const dayName = dayOrder.find(d => d.toLowerCase() === t.day.toLowerCase());
      if (!dayName) return;

      grouped[dayName].push({
        time: t.startTime || t.classTime || 'TBD',
        subject: t.subject || 'Special Class',
        type: (t.subject || 'general').toLowerCase().replace(/[^a-z]/g, ''),
        teacher: t.teacherId?.name || t.teacherName || 'Academic Dept',
        room: t.room || 'Classroom'
      });
    });

    res.status(200).json({ 
      success: true, 
      data: grouped,
      _stats: { 
        total: timetables.length,
        final: timetables.length,
        ident: {
          name: `${student.firstName} ${student.lastName || ''}`,
          class: student.class?.className,
          section: student.section?.sectionName
        }
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── FEE ─────────────────────────────────────────────────────────────────────

exports.getFee = async (req, res) => {
  try {
    const user = await getUser(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const studentId = validateStudentAccess(user, req.query.studentId);
    if (!studentId) return res.status(403).json({ message: 'Access denied' });

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

    const studentId = validateStudentAccess(user, req.query.studentId);
    if (!studentId) return res.status(403).json({ message: 'Access denied' });

    const student = await Student.findById(studentId).lean();
    const classId = student?.class;
    const sectionId = student?.section;

    const query = { branch: user.branch };
    if (classId) query.class = classId;
    if (sectionId) query.section = sectionId;

    const assignments = await Assignment.find(query)
      .populate({
        path: 'teacherId',
        select: 'name profileImage teacher',
        populate: { path: 'teacher', select: 'name' }
      })
      .populate({
        path: 'createdBy',
        select: 'name teacher',
        populate: { path: 'teacher', select: 'name' }
      })
      .sort({ dueDate: 1 })
      .limit(20)
      .lean();

    // Fetch submissions for this student
    const submissions = await AssignmentSubmission.find({
      student: studentId,
      assignment: { $in: assignments.map(a => a._id) }
    }).lean();

    const formattedAssignments = assignments.map(a => {
      const teacherObj = a.teacherId || a.createdBy;
      const teacherName = teacherObj?.teacher?.name || teacherObj?.name || 'Class Teacher';
      const submission = submissions.find(s => s.assignment.toString() === a._id.toString());
      
      return {
        id: a._id,
        title: a.title,
        subject: a.subject,
        dueDate: new Date(a.dueDate).toLocaleDateString('en-GB'),
        status: submission ? (submission.status === 'graded' ? `Graded (${submission.marksReceived}/${a.marks})` : 'Submitted') : 'Pending',
        description: a.description,
        teacher: teacherName,
        totalMarks: a.marks || 0,
        submission: submission || null
      };
    });

    res.status(200).json({ success: true, data: formattedAssignments });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.submitAssignment = async (req, res) => {
  try {
    const user = await getUser(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { studentId, assignmentId, content, attachments } = req.body;
    if (!assignmentId) return res.status(400).json({ message: 'assignmentId required' });

    const sid = studentId || user.studentId;
    
    // Check if duplicate
    const existing = await AssignmentSubmission.findOne({ assignment: assignmentId, student: sid });
    if (existing) return res.status(400).json({ message: 'Assignment already submitted' });

    const submission = new AssignmentSubmission({
      assignment: assignmentId,
      student: sid,
      content,
      attachments: attachments || [],
      status: 'submitted',
      branch: user.branch,
      client: user.client
    });

    await submission.save();
    res.status(201).json({ success: true, message: 'Assignment submitted successfully', data: submission });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── NOTICES ─────────────────────────────────────────────────────────────────

exports.getNotices = async (req, res) => {
  try {
    const user = await getUser(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const studentId = validateStudentAccess(user, req.query.studentId);
    if (!studentId) return res.status(403).json({ message: 'Access denied' });

    const student = await Student.findById(studentId).populate('class').lean();
    const className = student?.class?.className || user.class; // Handle populated class name

    const notices = await Notice.find({
      branch: user.branch,
      isPublished: true,
      expiryDate: { $gte: new Date() },
      $or: [
        { class: 'All' },
        { class: className }
      ]
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

    const studentId = validateStudentAccess(user, req.query.studentId);
    if (!studentId) return res.status(403).json({ message: 'Access denied' });

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

exports.getBrowseBooks = async (req, res) => {
  try {
    const user = await getUser(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { search, category } = req.query;
    const query = { 
      branch: user.branch,
      availableCopies: { $gt: 0 }
    };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } }
      ];
    }
    if (category && category !== 'All') {
      query.category = category;
    }

    const books = await Book.find(query).limit(50).lean();
    res.status(200).json({ success: true, data: books });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.requestBook = async (req, res) => {
  try {
    const user = await getUser(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { studentId, bookId, priority } = req.body;
    if (!bookId) return res.status(400).json({ message: 'bookId required' });

    const sid = studentId || user.studentId;
    const student = await Student.findById(sid).lean();
    const book = await Book.findById(bookId).lean();

    if (!student || !book) return res.status(404).json({ message: 'Student or Book not found' });

    // Check if duplicate pending request
    const existing = await BookRequest.findOne({ 
      student: sid, 
      book: bookId, 
      status: 'Pending' 
    });
    if (existing) return res.status(400).json({ message: 'You already have a pending request for this book' });

    const request = new BookRequest({
      student: sid,
      studentName: `${student.firstName} ${student.lastName}`,
      studentId: student.customId || student.admissionNumber,
      book: bookId,
      bookTitle: book.title,
      priority: priority || 'Medium',
      branch: user.branch,
      client: user.client
    });

    await request.save();
    res.status(201).json({ success: true, message: 'Book request submitted successfully', data: request });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getBookRequests = async (req, res) => {
  try {
    const user = await getUser(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const studentId = validateStudentAccess(user, req.query.studentId);
    if (!studentId) return res.status(403).json({ message: 'Access denied' });

    const requests = await BookRequest.find({ student: studentId })
      .populate('book', 'title author category')
      .sort({ requestDate: -1 })
      .lean();

    res.status(200).json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── HOSTEL ───────────────────────────────────────────────────────────────────

exports.getHostel = async (req, res) => {
  try {
    const user = await getUser(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const studentId = validateStudentAccess(user, req.query.studentId);
    if (!studentId) return res.status(403).json({ message: 'Access denied' });

    const [allocation, menu, entryLogs, services] = await Promise.all([
      HostelAllocation.findOne({ studentId: studentId.toString(), allocationStatus: 'allocated' })
        .populate('hostel', 'hostelName contactNo').lean(),
      HostelMenu.find({ branch: user.branch }).sort({ day: 1 }).lean(),
      CheckInOut.find({ studentId: studentId.toString() }).sort({ timestamp: -1 }).limit(10).lean(),
      HostelService.find({ studentId: studentId.toString() }).sort({ createdAt: -1 }).limit(10).lean()
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

    const studentId = validateStudentAccess(user, req.query.studentId);
    if (!studentId) return res.status(403).json({ message: 'Access denied' });

    const student = await Student.findById(studentId)
      .populate('class', 'className _id')
      .populate('section', 'sectionName _id')
      .lean();
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const classId = student?.class?._id;
    const sectionId = student?.section?._id;

    const query = { 
      branch: user.branch,
      client: user.client
    };
    if (classId) query.class = classId;
    if (sectionId) query.section = sectionId;

    const classes = await LiveClass.find(query)
      .populate('createdBy', 'name')
      .sort({ date: 1 })
      .limit(20)
      .lean();

    const formattedClasses = classes.map(c => {
      const teacherName = c.createdBy?.name || 'Academic Dept';
      const classDate = new Date(c.date);
      
      return {
        id: c._id,
        title: c.title,
        topic: c.title,
        subject: c.subject,
        scheduledAt: c.date,
        date: classDate.toLocaleDateString('en-GB'),
        startTime: classDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        endTime: c.duration ? `${new Date(classDate.getTime() + parseInt(c.duration) * 60000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : 'N/A',
        duration: c.duration || '60',
        teacher: teacherName,
        status: c.status?.toLowerCase() || 'scheduled',
        meetingLink: c.meetLink || '#',
        description: c.description || ''
      };
    });

    res.status(200).json({ success: true, data: formattedClasses });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── RECORDED CLASSES ─────────────────────────────────────────────────────────

exports.getRecordedClasses = async (req, res) => {
  try {
    const user = await getUser(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const studentId = validateStudentAccess(user, req.query.studentId);
    if (!studentId) return res.status(403).json({ message: 'Access denied' });

    const student = await Student.findById(studentId)
      .populate('class', 'className _id')
      .populate('section', 'sectionName _id')
      .lean();
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const classId = student?.class?._id?.toString();
    const sectionId = student?.section?._id?.toString();
    const sBranch = user.branch?.toString();
    const sClient = user.client?.toString();

    let videos = [];

    // Try 1: Fetch with class and section
    if (classId && sectionId) {
      videos = await VideoClass.find({ 
        branch: sBranch,
        client: sClient,
        class: classId,
        section: sectionId
      })
        .populate('class', 'className')
        .populate('section', 'sectionName')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
    }

    // Try 2: If no videos, fetch with class only
    if (videos.length === 0 && classId) {
      videos = await VideoClass.find({ 
        branch: sBranch,
        client: sClient,
        class: classId
      })
        .populate('class', 'className')
        .populate('section', 'sectionName')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
    }

    // Try 3: If still no videos, fetch all for branch
    if (videos.length === 0) {
      videos = await VideoClass.find({ 
        branch: sBranch,
        client: sClient
      })
        .populate('class', 'className')
        .populate('section', 'sectionName')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
    }

    const formattedVideos = videos.map(v => {
      const teacherName = v.createdBy?.name || 'Academic Dept';
      
      return {
        id: v._id,
        title: v.title || 'Untitled Video',
        subject: v.subject || 'General',
        duration: v.duration || '0',
        thumbnail: v.thumbnailUrl || '',
        videoUrl: v.videoUrl || '',
        teacher: teacherName,
        uploadedAt: new Date(v.createdAt).toLocaleDateString('en-GB'),
        views: v.views || 0,
        class: v.class?.className || 'All Classes',
        section: v.section?.sectionName || 'All Sections'
      };
    });

    res.status(200).json({ 
      success: true, 
      data: formattedVideos,
      _debug: {
        studentClass: student.class?.className,
        studentSection: student.section?.sectionName,
        totalFound: formattedVideos.length
      }
    });
  } catch (error) {
    console.error('Recorded Classes Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── E-DIARY ──────────────────────────────────────────────────────────────────

exports.getEDiary = async (req, res) => {
  try {
    const user = await getUser(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const studentId = validateStudentAccess(user, req.query.studentId);
    if (!studentId) return res.status(403).json({ message: 'Access denied' });

    const student = await Student.findById(studentId).lean();
    const classId = student?.class;

    const query = { branch: user.branch };
    if (classId) query.class = classId;

    const diaries = await Diary.find(query)
      .populate({
        path: 'createdBy',
        select: 'name teacher',
        populate: { path: 'teacher', select: 'name' }
      })
      .sort({ date: -1 })
      .limit(20)
      .lean();

    const formattedDiaries = diaries.map(d => {
      const teacherName = d.createdBy?.teacher?.name || d.createdBy?.name || 'Class Teacher';
      
      return {
        id: d._id,
        subject: d.title, // or d.subject if available, fallback to title
        teacher: teacherName,
        date: new Date(d.date).toLocaleDateString('en-GB'),
        priority: d.priority || 'normal',
        topic: d.content,
        homework: d.type === 'homework' ? d.content : 'No homework assigned',
        notes: d.type === 'important' ? d.content : 'Follow the class notes',
        status: 'pending', // Diary entries are typically read-only references
        type: d.type || 'general'
      };
    });

    res.status(200).json({ success: true, data: formattedDiaries });
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
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { studentId, serviceType, serviceCategory, description } = req.body;
    const sid = studentId || user.studentId;
    
    const student = await Student.findById(sid).select('firstName lastName').lean();
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const service = new HostelService({
      studentId: sid,
      studentName: `${student.firstName} ${student.lastName}`,
      serviceType: serviceType || 'General Request',
      serviceCategory: serviceCategory || 'Other',
      description,
      date: new Date().toLocaleDateString('en-GB'),
      time: new Date().toLocaleTimeString('en-GB'),
      status: 'Pending',
      branch: user.branch,
      client: user.client
    });

    await service.save();
    res.status(201).json({ success: true, message: 'Service requested successfully', data: service });
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

    const studentId = validateStudentAccess(user, req.query.studentId);
    if (!studentId) return res.status(403).json({ message: 'Access denied' });

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

    const studentId = validateStudentAccess(user, req.query.studentId);
    if (!studentId) return res.status(403).json({ message: 'Access denied' });

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

    const studentId = validateStudentAccess(user, req.query.studentId);
    if (!studentId) return res.status(403).json({ message: 'Access denied' });

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

// ─── UPDATE STUDENT PROFILE ──────────────────────────────────────────────────

exports.updateProfile = async (req, res) => {
  try {
    const user = await getUser(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { mobile, address, city, state, pincode } = req.body;
    const updateData = {};
    if (mobile) updateData.mobile = mobile;
    if (address) updateData.currentAddress = address;
    if (city) updateData.city = city;
    if (state) updateData.state = state;
    if (pincode) updateData.pincode = pincode;

    const updated = await ParentStudent.findByIdAndUpdate(req.userId, updateData, { new: true }).select('-password').lean();
    res.status(200).json({ success: true, message: 'Profile updated successfully', data: updated });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── STUDENT PROFILE ──────────────────────────────────────────────────────────

exports.getStudentProfile = async (req, res) => {
  try {
    const user = await getUser(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const studentId = validateStudentAccess(user, req.query.studentId);
    if (!studentId) return res.status(403).json({ message: 'Access denied' });

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

// ─── STAFF: CREATE PARENT CREDENTIALS ──────────────────────────────────────────

exports.createParentCredentials = async (req, res) => {
  try {
    const { firstName, lastName, mobile, password, studentId } = req.body;
    const Admin = require('../model/Admin');
    const Staff = require('../model/Staff');
    
    // Check if user is Admin or Staff
    let user = await Admin.findById(req.userId).lean();
    if (!user) {
      user = await Staff.findById(req.userId).lean();
    }
    if (!user) return res.status(403).json({ message: 'Access denied' });

    if (!firstName || !mobile || !password || !studentId) {
      return res.status(400).json({ message: 'firstName, mobile, password and studentId are required' });
    }

    // Check if parent already exists for this mobile
    const existing = await ParentStudent.findOne({ mobile, role: 'parent' });
    if (existing) {
      // Add student to existing parent's children
      if (!existing.children.some(c => c.studentId?.toString() === studentId)) {
        const student = await Student.findById(studentId).select('firstName lastName class section rollNumber').lean();
        existing.children.push({
          studentId,
          name: `${student.firstName} ${student.lastName}`,
          class: student.class?.toString(),
          section: student.section?.toString(),
          rollNo: student.rollNumber
        });
        await existing.save();
      }
      return res.status(200).json({ success: true, message: 'Student added to existing parent', data: existing });
    }

    // Create new parent
    const student = await Student.findById(studentId).select('firstName lastName class section rollNumber').lean();
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const parent = new ParentStudent({
      firstName,
      lastName: lastName || '',
      mobile,
      password,
      role: 'parent',
      children: [{
        studentId,
        name: `${student.firstName} ${student.lastName}`,
        class: student.class?.toString(),
        section: student.section?.toString(),
        rollNo: student.rollNumber
      }],
      branch: user.branch,
      client: user.client,
      status: true
    });

    await parent.save();
    const { password: _, ...parentData } = parent.toObject();
    res.status(201).json({ success: true, message: 'Parent credentials created successfully', data: parentData });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── STAFF: GET PARENT CREDENTIALS BY STUDENT ──────────────────────────────────

exports.getParentCredentialsByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const Admin = require('../model/Admin');
    const Staff = require('../model/Staff');
    
    // Check if user is Admin or Staff
    let user = await Admin.findById(req.userId).lean();
    if (!user) {
      user = await Staff.findById(req.userId).lean();
    }
    if (!user) return res.status(403).json({ message: 'Access denied' });

    // Find parents who have this student in their children
    const parents = await ParentStudent.find({
      'children.studentId': studentId,
      role: 'parent',
      branch: user.branch
    }).select('-password').lean();

    res.status(200).json({ success: true, data: parents });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── STAFF: UPDATE PARENT CREDENTIALS ──────────────────────────────────────────

exports.updateParentCredentials = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, mobile, password } = req.body;
    const Admin = require('../model/Admin');
    const Staff = require('../model/Staff');
    
    // Check if user is Admin or Staff
    let user = await Admin.findById(req.userId).lean();
    if (!user) {
      user = await Staff.findById(req.userId).lean();
    }
    if (!user) return res.status(403).json({ message: 'Access denied' });

    const parent = await ParentStudent.findById(id);
    if (!parent) return res.status(404).json({ message: 'Parent not found' });
    if (parent.branch.toString() !== user.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (firstName) parent.firstName = firstName;
    if (lastName) parent.lastName = lastName;
    if (mobile) parent.mobile = mobile;
    if (password) parent.password = password;

    await parent.save();
    const { password: _, ...parentData } = parent.toObject();
    res.status(200).json({ success: true, message: 'Parent credentials updated successfully', data: parentData });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── STAFF: DELETE PARENT CREDENTIALS ──────────────────────────────────────────

exports.deleteParentCredentials = async (req, res) => {
  try {
    const { id } = req.params;
    const Admin = require('../model/Admin');
    const Staff = require('../model/Staff');
    
    // Check if user is Admin or Staff
    let user = await Admin.findById(req.userId).lean();
    if (!user) {
      user = await Staff.findById(req.userId).lean();
    }
    if (!user) return res.status(403).json({ message: 'Access denied' });

    const parent = await ParentStudent.findById(id);
    if (!parent) return res.status(404).json({ message: 'Parent not found' });
    if (parent.branch.toString() !== user.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await ParentStudent.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'Parent credentials deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── FEE PAYMENT FLOW ────────────────────────────────────────────────────────

exports.initiateFeePayment = async (req, res) => {
  try {
    const user = await getUser(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { feeId, amount } = req.body;
    if (!feeId || !amount) return res.status(400).json({ message: 'feeId and amount required' });

    const transactionId = `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // In a real app, this would integrate with Razorpay/Stripe
    res.status(200).json({ 
      success: true, 
      message: 'Payment initiation successful', 
      data: {
        transactionId,
        amount,
        feeId,
        currency: 'INR'
      } 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.confirmPayment = async (req, res) => {
  try {
    const user = await getUser(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { feeId, amount, transactionId, paymentMode } = req.body;
    const studentId = user.studentId;

    if (!feeId || !amount) return res.status(400).json({ message: 'Missing fields' });

    // Find a system user to "collect" the payment (e.g. Finance Admin)
    const Admin = require('../model/Admin');
    const collector = await Admin.findOne({ role: 'admin', branch: user.branch });

    const payment = new FeeCollection({
      student: studentId,
      branch: user.branch,
      client: user.client,
      feeType: 'Tuition Fee', // In real app, fetch from fee record
      amount: amount,
      amountPaid: amount,
      balance: 0,
      paymentMode: paymentMode || 'Online',
      transactionId: transactionId || `SIM-${Date.now()}`,
      status: 'paid',
      collectedBy: collector ? collector._id : user._id
    });

    await payment.save();
    res.status(200).json({ success: true, message: 'Payment confirmed and recorded', data: payment });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
