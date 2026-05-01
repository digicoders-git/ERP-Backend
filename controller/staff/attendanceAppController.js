const Attendance = require('../../model/Attendance');
const Student = require('../../model/Student');
const AttendanceSetting = require('../../model/AttendanceSetting');

const dateToUTCRange = (dateStr) => {
  const start = new Date(dateStr);
  start.setHours(0, 0, 0, 0);
  const end = new Date(dateStr);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

exports.appCheckin = async (req, res) => {
  try {
    const studentId = req.userId; // Assuming student is logged in
    const branchId = req.user.branch;
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const { start: queryDate } = dateToUTCRange(dateStr);

    // 1. Fetch Settings
    const settings = await AttendanceSetting.findOne({ branch: branchId });
    if (settings && settings.mode === 'biometric') {
        return res.status(400).json({ success: false, message: 'App check-in disabled: System is in Biometric Only mode' });
    }

    // 2. Priority Logic: Don't overwrite Biometric or Excel if they exist
    const existing = await Attendance.findOne({
        branch: branchId,
        date: queryDate,
        studentId: studentId,
        source: { $in: ['biometric', 'excel'] }
    });

    if (existing) {
        return res.status(200).json({ success: true, message: 'Attendance already recorded via higher priority source' });
    }

    // 3. Mark via App
    const student = await Student.findById(studentId).select('class section').lean();
    
    await Attendance.findOneAndUpdate(
        {
            branch: branchId,
            date: queryDate,
            studentId: studentId,
            type: 'student'
        },
        {
            $set: {
                status: 'present',
                source: 'app',
                timeIn: now,
                markedBy: studentId,
                markedByType: 'Student' // You might need to update your markedByType enum
            },
            $setOnInsert: {
                classId: student.class,
                sectionId: student.section
            }
        },
        { upsert: true }
    );

    res.status(200).json({ success: true, message: 'Attendance marked via App' });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
