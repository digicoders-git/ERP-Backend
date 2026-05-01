const Attendance = require('../../model/Attendance');
const Student = require('../../model/Student');
const AttendanceSetting = require('../../model/AttendanceSetting');
const ExcelJS = require('exceljs');
const mongoose = require('mongoose');

// Helper to get date range for a day (local time)
const dateToUTCRange = (dateStr) => {
  const start = new Date(dateStr);
  start.setHours(0, 0, 0, 0);
  const end = new Date(dateStr);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

exports.uploadExcelAttendance = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an Excel file' });
    }

    const branchId = req.user.branch;
    const { date } = req.body;
    if (!date) return res.status(400).json({ success: false, message: 'Please provide attendance date' });

    const { start: queryDate } = dateToUTCRange(date);

    // 1. Fetch Settings
    const settings = await AttendanceSetting.findOne({ branch: branchId });
    if (settings && settings.mode === 'biometric') {
        return res.status(400).json({ success: false, message: 'Excel upload disabled: System is in Biometric Only mode' });
    }

    // 2. Parse Excel
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const worksheet = workbook.getWorksheet(1);

    const attendanceData = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const admissionNumber = row.getCell(1).value?.toString();
      const status = row.getCell(2).value?.toString().toLowerCase();

      if (admissionNumber && status) {
        attendanceData.push({ admissionNumber, status });
      }
    });

    if (attendanceData.length === 0) {
        return res.status(400).json({ success: false, message: 'No valid data found in Excel' });
    }

    // 3. Process records with Merge Logic (Priority: Biometric > Excel > Manual)
    let processedCount = 0;
    for (const item of attendanceData) {
        const student = await Student.findOne({ branch: branchId, admissionNumber: item.admissionNumber }).select('_id class section').lean();
        if (!student) continue;

        // Check if Biometric record already exists for today
        const existing = await Attendance.findOne({
            branch: branchId,
            date: queryDate,
            studentId: student._id,
            source: 'biometric'
        });

        // If biometric exists, don't overwrite with Excel
        if (existing) continue;

        // Upsert Excel attendance
        await Attendance.findOneAndUpdate(
            {
                branch: branchId,
                date: queryDate,
                studentId: student._id,
                type: 'student'
            },
            {
                $set: {
                    status: item.status === 'p' || item.status === 'present' ? 'present' : 'absent',
                    source: 'excel',
                    markedBy: req.userId,
                    markedByType: 'Admin'
                },
                $setOnInsert: {
                    classId: student.class,
                    sectionId: student.section
                }
            },
            { upsert: true }
        );
        processedCount++;
    }

    res.status(200).json({ 
        success: true, 
        message: `Successfully processed ${processedCount} records from Excel.`,
        skipped: attendanceData.length - processedCount
    });

  } catch (error) {
    console.error('Excel Upload Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
