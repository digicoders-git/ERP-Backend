const EntryExit = require('../../model/EntryExit');
const { successResponse, errorResponse } = require('../../responseFormatter');

exports.getAll = async (req, res) => {
  try {
    const { date, action, studentId } = req.query;
    const filter = {};
    if (date) filter.date = date;
    if (action) filter.action = action;
    if (studentId) filter.studentId = studentId;
    const records = await EntryExit.find(filter).sort({ timestamp: -1 }).lean();
    return successResponse(res, records, 'Records fetched');
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
