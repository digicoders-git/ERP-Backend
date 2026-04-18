const Student = require('../../model/Student');
const Attendance = require('../../model/Attendance');

let alertHistory = [];

// Try to load nodemailer, but don't fail if not installed
let transporter = null;
try {
  const nodemailer = require('nodemailer');
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'your-email@gmail.com',
      pass: process.env.EMAIL_PASSWORD || 'your-app-password'
    }
  });
} catch (error) {
  console.warn('Nodemailer not installed. Email alerts will be logged only.');
}

// SMS service (using console log for demo)
const sendSMS = async (phone, message) => {
  try {
    console.log(`[SMS] To: ${phone}, Message: ${message}`);
    return true;
  } catch (error) {
    console.error('SMS sending error:', error);
    return false;
  }
};

// Email sending function
const sendEmail = async (email, subject, message) => {
  try {
    if (!transporter) {
      console.log(`[EMAIL] To: ${email}, Subject: ${subject}, Message: ${message}`);
      return true;
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px;">
          <h2 style="color: #1f2937; margin-bottom: 20px;">${subject}</h2>
          <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">${message}</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #9ca3af; font-size: 12px;">
            This is an automated message from your school. Please do not reply to this email.
          </p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_USER || 'noreply@school.com',
      to: email,
      subject: subject,
      html: htmlContent
    });

    console.log(`[EMAIL] Sent to: ${email}, Subject: ${subject}`);
    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
};

exports.sendSMSAlert = async (req, res) => {
  try {
    const { studentId, message } = req.body;
    const adminId = req.userId;
    const branch = req.user?.branch || req.branch;

    if (!studentId || !message) {
      return res.status(400).json({ success: false, message: 'Student ID and message are required' });
    }

    const student = await Student.findOne({ _id: studentId, branch })
      .select('firstName lastName rollNumber phone guardianInfo').lean();

    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const name = `${student.firstName} ${student.lastName}`;
    const phone = student.guardianInfo?.guardianPhone || student.phone;

    // Send SMS
    const smsSent = await sendSMS(phone, message);

    const alertRecord = {
      id: Date.now(),
      studentId: student._id,
      studentName: name,
      rollNo: student.rollNumber,
      type: 'sms',
      message,
      timestamp: new Date().toISOString(),
      status: smsSent ? 'sent' : 'failed',
      sentBy: adminId
    };

    alertHistory.unshift(alertRecord);
    if (alertHistory.length > 100) alertHistory = alertHistory.slice(0, 100);

    res.status(200).json({
      success: true,
      message: smsSent ? 'SMS alert sent successfully' : 'SMS alert queued (check logs)',
      data: { studentName: name, phone, sentAt: new Date(), status: alertRecord.status }
    });
  } catch (error) {
    console.error('Send SMS alert error:', error);
    res.status(500).json({ success: false, message: 'Failed to send SMS alert', error: error.message });
  }
};

exports.sendEmailAlert = async (req, res) => {
  try {
    const { studentId, subject, message } = req.body;
    const adminId = req.userId;
    const branch = req.user?.branch || req.branch;

    if (!studentId || !subject || !message) {
      return res.status(400).json({ success: false, message: 'Student ID, subject, and message are required' });
    }

    const student = await Student.findOne({ _id: studentId, branch })
      .select('firstName lastName rollNumber email guardianInfo').lean();

    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const name = `${student.firstName} ${student.lastName}`;
    const email = student.guardianInfo?.guardianEmail || student.email;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Parent email not found' });
    }

    // Send Email
    const emailSent = await sendEmail(email, subject, message);

    const alertRecord = {
      id: Date.now(),
      studentId: student._id,
      studentName: name,
      rollNo: student.rollNumber,
      type: 'email',
      subject,
      message,
      timestamp: new Date().toISOString(),
      status: emailSent ? 'sent' : 'failed',
      sentBy: adminId
    };

    alertHistory.unshift(alertRecord);
    if (alertHistory.length > 100) alertHistory = alertHistory.slice(0, 100);

    res.status(200).json({
      success: true,
      message: emailSent ? 'Email alert sent successfully' : 'Email alert queued (check logs)',
      data: { studentName: name, email, sentAt: new Date(), status: alertRecord.status }
    });
  } catch (error) {
    console.error('Send email alert error:', error);
    res.status(500).json({ success: false, message: 'Failed to send email alert', error: error.message });
  }
};

exports.sendBulkAlerts = async (req, res) => {
  try {
    const { classId, sectionId, type, message, subject } = req.body;
    const adminId = req.userId;
    const branch = req.user?.branch || req.branch;

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

    let sentCount = 0;
    const failedAlerts = [];

    for (const record of absentRecords) {
      if (!record.studentId) continue;

      const s = record.studentId;
      const studentName = `${s.firstName} ${s.lastName}`;

      try {
        let alertSent = false;

        if (type === 'sms' || type === 'both') {
          const phone = s.guardianInfo?.guardianPhone || s.phone;
          if (phone) {
            alertSent = await sendSMS(phone, message);
          }
        }

        if (type === 'email' || type === 'both') {
          const email = s.guardianInfo?.guardianEmail || s.email;
          if (email) {
            alertSent = await sendEmail(email, subject || 'Absence Alert', message);
          }
        }

        if (alertSent) sentCount++;

        alertHistory.unshift({
          id: Date.now() + Math.random(),
          studentId: s._id,
          studentName: studentName,
          rollNo: s.rollNumber,
          type,
          message,
          subject: subject || 'Absence Alert',
          timestamp: new Date().toISOString(),
          status: alertSent ? 'sent' : 'failed',
          sentBy: adminId
        });
      } catch (error) {
        console.error(`Error sending alert to ${studentName}:`, error);
        failedAlerts.push(studentName);
      }
    }

    if (alertHistory.length > 100) alertHistory = alertHistory.slice(0, 100);

    res.status(200).json({
      success: true,
      message: `Bulk ${type} alerts processed. Sent: ${sentCount}/${absentRecords.length}`,
      count: sentCount,
      total: absentRecords.length,
      failed: failedAlerts.length > 0 ? failedAlerts : undefined
    });
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
    { id: 1, name: 'Absence Alert', type: 'both', subject: 'Student Absence Notification', message: 'Dear Parent, Your child {studentName} was absent from school today. Please contact the school for more information.' },
    { id: 2, name: 'Late Arrival', type: 'sms', message: 'Your child {studentName} arrived late to school today. Please ensure timely arrival.' },
    { id: 3, name: 'Assignment Reminder', type: 'email', subject: 'Assignment Submission Reminder', message: 'Dear Parent, {studentName} has a pending assignment due soon. Please ensure it is completed on time.' },
    { id: 4, name: 'Exam Notification', type: 'both', subject: 'Upcoming Exam Notification', message: 'Dear Parent, {studentName} has an exam scheduled. Please ensure proper preparation and attendance.' },
    { id: 5, name: 'Performance Alert', type: 'email', subject: 'Academic Performance Update', message: 'Dear Parent, We would like to discuss {studentName}\'s recent academic performance. Please contact the school.' }
  ];
  res.status(200).json({ success: true, data: templates });
};

exports.getAbsentStudents = async (req, res) => {
  try {
    const { classId, sectionId, date } = req.query;
    const branch = req.user?.branch || req.branch;

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
        id: r.studentId._id,
        studentId: r.studentId._id,
        name: `${r.studentId.firstName} ${r.studentId.lastName}`,
        rollNo: r.studentId.rollNumber,
        email: r.studentId.guardianInfo?.guardianEmail || r.studentId.email,
        phone: r.studentId.guardianInfo?.guardianPhone || r.studentId.phone,
        date: queryDate.toISOString().split('T')[0]
      }));

    res.status(200).json({ success: true, data: absentStudents, count: absentStudents.length, date: queryDate.toISOString().split('T')[0] });
  } catch (error) {
    console.error('Get absent students error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch absent students', error: error.message });
  }
};

exports.getClassStudents = async (req, res) => {
  try {
    const { classId, sectionId } = req.query;
    const branch = req.user?.branch || req.branch;

    if (!classId || !sectionId) {
      return res.status(400).json({ success: false, message: 'Class and section are required' });
    }

    const students = await Student.find({ branch, class: classId, section: sectionId })
      .select('firstName lastName rollNumber email phone guardianInfo')
      .lean();

    const studentList = students.map(s => ({
      id: s._id,
      studentId: s._id,
      name: `${s.firstName} ${s.lastName}`,
      rollNo: s.rollNumber,
      email: s.guardianInfo?.guardianEmail || s.email,
      phone: s.guardianInfo?.guardianPhone || s.phone
    }));

    res.status(200).json({ success: true, data: studentList, count: studentList.length });
  } catch (error) {
    console.error('Get class students error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch class students', error: error.message });
  }
};
