const EntryExit = require('../../model/EntryExit');
const { successResponse,  errorResponse } = require('../../responseFormatter');

exports.getAll = async (req, res) => {
  try {
    const { date, action, studentId } = req.query;
    const filter = {};
    if (date) filter.date = date;
    if (action) filter.action = action;
    if (studentId) filter.studentId = studentId;

    const HostelStudent = require('../../model/HostelStudent');
    const Student = require('../../model/Student');
    const BedAllocation = require('../../model/BedAllocation');

    const records = await EntryExit.find(filter).sort({ timestamp: -1 }).lean();

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

      const currentName = student ? (student.name || `${student.firstName} ${student.lastName}`) : item.studentName;
      const rollNumber = student ? (student.rollNumber || student.rollNo || 'N/A') : 'N/A';

      return {
        ...item,
        studentName: currentName,
        rollNumber: rollNumber,
        room: allotment ? allotment.roomNumber : (item.room || 'N/A')
      };
    }));

    return successResponse(res, enrichedRecords, 'Records fetched with fresh data');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.add = async (req, res) => {
  try {
    const now = new Date();
    const record = new EntryExit({
      ...req.body,
      date: req.body.date || now.toISOString().split('T')[0],
      time: req.body.time || now.toTimeString().split(' ')[0],
      timestamp: now,
      purpose: req.body.purpose || (req.body.action === 'entry' ? 'Hostel Entry' : 'Hostel Exit')
    });
    await record.save();
    return successResponse(res, record, 'Record added', 201);
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.remove = async (req, res) => {
  try {
    const record = await EntryExit.findByIdAndDelete(req.params.id);
    if (!record) return errorResponse(res, 'Not found', 404);
    return successResponse(res, null, 'Deleted');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.getTodayStats = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [entries, exits] = await Promise.all([
      EntryExit.countDocuments({ date: today, action: 'entry' }),
      EntryExit.countDocuments({ date: today, action: 'exit' })
    ]);
    // Latest action per student
    const latest = await EntryExit.aggregate([
      { $sort: { timestamp: -1 } },
      { $group: { _id: '$studentId', action: { $first: '$action' } } }
    ]);
    const currentlyInside = latest.filter(s => s.action === 'entry').length;
    return successResponse(res, { entries, exits, currentlyInside }, 'Stats fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

// Get latest status per student
exports.getStudentStatuses = async (req, res) => {
  try {
    const latest = await EntryExit.aggregate([
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: '$studentId',
          action: { $first: '$action' },
          studentName: { $first: '$studentName' },
          lastTime: { $first: '$time' },
          lastDate: { $first: '$date' }
        }
      }
    ]);
    return successResponse(res, latest, 'Student statuses fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};
