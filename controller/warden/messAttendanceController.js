const MessAttendance = require('../../model/MessAttendance');
const { successResponse,  errorResponse } = require('../../responseFormatter');

exports.getAll = async (req, res) => {
  try {
    const { date } = req.query;
    const filter = date ? { date } : {};

    const HostelStudent = require('../../model/HostelStudent');
    const Student = require('../../model/Student');
    const BedAllocation = require('../../model/BedAllocation');

    const records = await MessAttendance.find(filter).sort({ createdAt: -1 }).lean();

    // Self-healing: Populate latest student info for each record
    const enrichedRecords = await Promise.all(records.map(async (item) => {
      // 1. Try Hostel Database
      let student = await HostelStudent.findById(item.studentId).lean();
      
      // 2. Try Main School Database (Legacy)
      if (!student) {
        student = await Student.findById(item.studentId).lean();
      }

      // 3. Fetch current room
      const allotment = await BedAllocation.findOne({ studentId: item.studentId }).lean();

      const studentName = student ? (student.name || `${student.firstName} ${student.lastName}`) : (item.studentName || 'N/A');
      const rollNumber = student ? (student.rollNumber || student.rollNo || 'N/A') : 'N/A';

      return {
        ...item,
        studentName: studentName,
        rollNumber: rollNumber,
        roomNumber: allotment ? allotment.roomNumber : (item.roomNumber || 'N/A')
      };
    }));

    return successResponse(res, enrichedRecords, 'Mess attendance fetched with fresh data');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.save = async (req, res) => {
  try {
    const { date, records } = req.body;
    if (!date || !Array.isArray(records)) return errorResponse(res, 'date and records required', 400);
    await MessAttendance.deleteMany({ date });
    const saved = records.length ? await MessAttendance.insertMany(records.map(r => ({ ...r, date }))) : [];
    return successResponse(res, saved, 'Saved', 201);
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.add = async (req, res) => {
  try {
    const { studentId, date, studentName, breakfast, lunch, dinner } = req.body;
    const targetDate = date || new Date().toISOString().split('T')[0];

    // Upsert logic: Find existing record for student + date, or create new
    const record = await MessAttendance.findOneAndUpdate(
      { studentId, date: targetDate },
      { 
        $set: { 
          studentName: studentName || 'Student',
          breakfast: breakfast ?? false,
          lunch: lunch ?? false,
          dinner: dinner ?? false
        } 
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return successResponse(res, record, 'Attendance updated successfully', 201);
  } catch (error) {
    console.error('Mess Attendance Error:', error);
    return errorResponse(res, 'Server error during attendance marking', 500, error);
  }
};

exports.update = async (req, res) => {
  try {
    const record = await MessAttendance.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!record) return errorResponse(res, 'Not found', 404);
    return successResponse(res, record, 'Updated');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.remove = async (req, res) => {
  try {
    const record = await MessAttendance.findByIdAndDelete(req.params.id);
    if (!record) return errorResponse(res, 'Not found', 404);
    return successResponse(res, null, 'Deleted');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};
