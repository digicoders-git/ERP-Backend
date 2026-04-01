const CheckInOut = require('../../model/CheckInOut');
const { successResponse,  errorResponse } = require('../../responseFormatter');

exports.getAll = async (req, res) => {
  try {
    const { date, studentId } = req.query;
    const filter = {};
    if (date) filter.date = date;
    if (studentId) filter.studentId = studentId;
    const records = await CheckInOut.find(filter).sort({ timestamp: -1 }).lean();
    return successResponse(res, records, 'Records fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.add = async (req, res) => {
  try {
    const now = new Date();
    const record = new CheckInOut({
      ...req.body,
      date: req.body.date || now.toISOString().split('T')[0],
      time: req.body.time || now.toTimeString().split(' ')[0],
      timestamp: now
    });
    await record.save();
    return successResponse(res, record, 'Record added', 201);
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.remove = async (req, res) => {
  try {
    const record = await CheckInOut.findByIdAndDelete(req.params.id);
    if (!record) return errorResponse(res, 'Not found', 404);
    return successResponse(res, null, 'Deleted');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.getTodayStats = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [checkIns, checkOuts] = await Promise.all([
      CheckInOut.countDocuments({ date: today, action: 'checkin' }),
      CheckInOut.countDocuments({ date: today, action: 'checkout' })
    ]);
    // Latest action per student to determine who is currently in hostel
    const latest = await CheckInOut.aggregate([
      { $sort: { timestamp: -1 } },
      { $group: { _id: '$studentId', action: { $first: '$action' } } }
    ]);
    const inHostel = latest.filter(s => s.action === 'checkin').length;
    return successResponse(res, { checkIns, checkOuts, inHostel }, 'Stats fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};
