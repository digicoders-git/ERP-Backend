const HostelAttendance = require('../../model/HostelAttendance');
const { successResponse, errorResponse } = require('../../responseFormatter');

exports.getAttendance = async (req, res) => {
  try {
    const { date, attendanceType } = req.query;
    const filter = {};
    if (date) filter.date = date;
    if (attendanceType) filter.attendanceType = attendanceType;
    const records = await HostelAttendance.find(filter).sort({ createdAt: -1 }).lean();
    return successResponse(res, records, 'Attendance fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

// Bulk save - delete existing for date+type then insert fresh
exports.saveAttendance = async (req, res) => {
  try {
    const { date, attendanceType, records } = req.body;
    if (!date || !attendanceType || !Array.isArray(records)) {
      return errorResponse(res, 'date, attendanceType and records required', 400);
    }
    await HostelAttendance.deleteMany({ date, attendanceType });
    const docs = records.map(r => ({ ...r, date, attendanceType }));
    const saved = docs.length ? await HostelAttendance.insertMany(docs) : [];
    return successResponse(res, saved, 'Attendance saved', 201);
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.getStats = async (req, res) => {
  try {
    const { date } = req.query;
    const filter = date ? { date } : {};
    const [total, present, absent] = await Promise.all([
      HostelAttendance.countDocuments(filter),
      HostelAttendance.countDocuments({ ...filter, status: 'present' }),
      HostelAttendance.countDocuments({ ...filter, status: 'absent' })
    ]);
    return successResponse(res, { total, present, absent }, 'Stats fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};
