const Attendance = require('../../model/Attendance');
const Student = require('../../model/Student');
const AttendanceSetting = require('../../model/AttendanceSetting');
const mongoose = require('mongoose');

// Helper to get date range for a day (local time)
const dateToUTCRange = (dateStr) => {
  const start = new Date(dateStr);
  start.setHours(0, 0, 0, 0);
  const end = new Date(dateStr);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const processSync = async (payload, isTest, res) => {
  try {
    const { biometric_id, student_id, time, branch_id } = payload;
    
    // 1. Find Student
    let query = {};
    if (student_id) query = { _id: student_id };
    else if (biometric_id) query = { biometricId: biometric_id };
    else return res.status(400).json({ success: false, message: 'Missing student identifier' });

    const student = await Student.findOne(query).select('class section branch firstName lastName').lean();
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const branchId = branch_id || student.branch;

    // 2. Check Settings
    const settings = await AttendanceSetting.findOne({ branch: branchId });
    if (!settings) return res.status(400).json({ success: false, message: 'Attendance settings not configured for this branch' });

    // Enforce mode logic
    if (settings.studentMode === 'manual') {
        return res.status(400).json({ success: false, message: 'Biometric sync disabled: System is in Manual Only mode' });
    }

    if (!isTest && settings.deviceMode === 'test') {
        return res.status(400).json({ success: false, message: 'Live sync rejected: System is in Test/Simulation mode' });
    }

    if (isTest && settings.deviceMode === 'live') {
        return res.status(400).json({ success: false, message: 'Test sync rejected: System is in Live Device mode' });
    }

    // 3. Update Attendance
    const syncTime = time ? new Date(time) : new Date();
    const dateStr = syncTime.toISOString().split('T')[0];
    const { start: queryDate } = dateToUTCRange(dateStr);

    const updateData = {
        status: 'present',
        source: 'biometric',
        mode: settings.mode,
        device_mode: settings.deviceMode,
        timeIn: syncTime
    };

    const attendance = await Attendance.findOneAndUpdate(
        {
            branch: branchId,
            date: queryDate,
            studentId: student._id,
            type: 'student'
        },
        { 
            $set: updateData,
            $setOnInsert: {
                classId: student.class,
                sectionId: student.section
            }
        },
        { upsert: true, new: true }
    );

    res.status(200).json({ 
        success: true, 
        message: `Attendance synced via ${isTest ? 'Test' : 'Live'} Biometric`,
        data: {
            student: `${student.firstName} ${student.lastName}`,
            time: syncTime,
            status: 'present'
        }
    });

  } catch (error) {
    console.error('Biometric Sync Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.testSync = async (req, res) => {
    // Expects { student_id or biometric_id, time, branch_id }
    await processSync(req.body, true, res);
};

exports.liveSync = async (req, res) => {
    // Expects { biometric_id, time, branch_id }
    await processSync(req.body, false, res);
};
