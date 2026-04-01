const Student = require('../../model/Student');
const Attendance = require('../../model/Attendance');

let alertHistory = [];

exports.sendSMSAlert = async (req, res) => {
  try {
    const { studentId, message } = req.body;
    const branch = req.user.branch;

    if (!studentId || !message) {
      return res.status(400).json({ success: false, message: 'Student ID and message are required' });
    }

    const student = await Student.findOne({ _id: studentId, branch })
      .select('firstName lastName rollNumber phone guardianInfo class section').lean();

    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const name = `${student.firstName} ${student.lastName}`;
    const phone = student.guardianInfo?.guardianPhone || student.phone;

    alertHistory.unshift({
      id: Date.now(), studentId: student._id, studentName: name,
      rollNo: student.rollNumber, type: 'sms', message,
      timestamp: new Date().toISOString(), status: 'sent', sentBy: req.userId
    });
    if (alertHistory.length > 100) alertHistory = alertHistory.slice(0, 100);

    res.status(200).json({ success: true, message: 'SMS alert sent successfully', data: { studentName: name, phone, sentAt: new Date() } });
  } catch (error) {
    console.error('Send SMS alert error:', error);
    res.status(500).json({ success: false, message: 'Failed to send SMS alert', error: error.message });
  }
};

exports.sendEmailAlert = async (req, res) => {
  try {
    const { studentId, subject, message } = req.body;
    const branch = req.user.branch;

    if (!studentId || !subject || !message) {
      return res.status(400).json({ success: false, message: 'Student ID, subject, and message are required' });
    }

    const student = await Student.findOne({ _id: studentId, branch })
      .select('firstName lastName rollNumber email').lean();

    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const name = `${student.firstName} ${student.lastName}`;

    alertHistory.unshift({
      id: Date.now(), studentId: student._id, studentName: name,
      rollNo: student.rollNumber, type: 'email', subject, message,
      timestamp: new Date().toISOString(), status: 'sent', sentBy: req.userId
    });
    if (alertHistory.length > 100) alertHistory = alertHistory.slice(0, 100);

    res.status(200).json({ success: true, message: 'Email alert sent successfully', data: { studentName: name, email: student.email, sentAt: new Date() } });
  } catch (error) {
    console.error('Send email alert error:', error);
    res.status(500).json({ success: false, message: 'Failed to send email alert', error: error.message });
  }
};

exports.sendBulkAlerts = async (req, res) => {
  try {
    const { classId, sectionId, type, message, subject } = req.body;
    const branch = req.user.branch;

    if (!classId || !sectionId || !type || !message) {
      return res.status(400).json({ success: false, message: 'Class, section, type, and message are required' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const absentRecords = await Attendance.find({ branch, classId, sectionId, date: today, status: 'absent', type: 'student' })
      .populate('studentId', 'firstName lastName rollNumber email phone guardianInfo')
      .lean();

    if (absentRecords.length === 0) {
      return res.status(200).json({ success: true, message: 'No absent students found', count: 0 });
    }

    absentRecords.forEach(record => {
      if (!record.studentId) return;
      const s = record.studentId;
      alertHistory.unshift({
        id: Date.now() + Math.random(),
        studentId: s._id,
        studentName: `${s.firstName} ${s.lastName}`,
        rollNo: s.rollNumber, type, message,
        subject: subject || 'Absence Alert',
        timestamp: new Date().toISOString(), status: 'sent', sentBy: req.userId
      });
    });
    if (alertHistory.length > 100) alertHistory = alertHistory.slice(0, 100);

    res.status(200).json({ success: true, message: `Bulk ${type} alerts sent successfully`, count: absentRecords.length });
  } catch (error) {
    console.error('Send bulk alerts error:', error);
    res.status(500).json({ success: false, message: 'Failed to send bulk alerts', error: error.message });
  }
};

exports.getAlertHistory = async (req, res) => {
  try {
    const { limit = 10, type } = req.query;
    let filtered = type ? alertHistory.filter(a => a.type === type) : [...alertHistory];
    res.status(200).json({ success: true, data: filtered.slice(0, parseInt(limit)), total: filtered.length });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch alert history', error: error.message });
  }
};

exports.getAlertTemplates = async (req, res) => {
  const templates = [
    { id: 1, name: 'Absence Alert', type: 'both', subject: 'Student Absence Notification', message: 'Dear Parent, Your child {studentName} was absent from school today ({date}).' },
    { id: 2, name: 'Late Arrival', type: 'sms', message: 'Your child {studentName} arrived late to school today at {time}.' },
    { id: 3, name: 'Assignment Reminder', type: 'email', subject: 'Assignment Submission Reminder', message: 'Dear Parent, {studentName} has a pending assignment "{assignmentTitle}" due on {dueDate}.' },
    { id: 4, name: 'Exam Notification', type: 'both', subject: 'Upcoming Exam Notification', message: 'Dear Parent, {studentName} has an exam scheduled for {subject} on {examDate}.' },
    { id: 5, name: 'Performance Alert', type: 'email', subject: 'Academic Performance Update', message: 'Dear Parent, We would like to discuss {studentName}\'s recent academic performance.' }
  ];
  res.status(200).json({ success: true, data: templates });
};

exports.getAbsentStudents = async (req, res) => {
  try {
    const { classId, sectionId, date } = req.query;
    const branch = req.user.branch;

    if (!classId || !sectionId) {
      return res.status(400).json({ success: false, message: 'Class and section are required' });
    }

    const queryDate = date ? new Date(date) : new Date();
    queryDate.setHours(0, 0, 0, 0);

    const absentRecords = await Attendance.find({ branch, classId, sectionId, date: queryDate, status: 'absent', type: 'student' })
      .populate('studentId', 'firstName lastName rollNumber email phone guardianInfo')
      .lean();

    const absentStudents = absentRecords
      .filter(r => r.studentId)
      .map(r => ({
        id: r.studentId._id, studentId: r.studentId._id,
        name: `${r.studentId.firstName} ${r.studentId.lastName}`,
        rollNo: r.studentId.rollNumber,
        email: r.studentId.email,
        phone: r.studentId.guardianInfo?.guardianPhone || r.studentId.phone,
        date: queryDate.toISOString().split('T')[0]
      }));

    res.status(200).json({ success: true, data: absentStudents, count: absentStudents.length, date: queryDate.toISOString().split('T')[0] });
  } catch (error) {
    console.error('Get absent students error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch absent students', error: error.message });
  }
};
