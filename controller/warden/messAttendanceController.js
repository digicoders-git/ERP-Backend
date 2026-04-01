const MessAttendance = require('../../model/MessAttendance');
const { successResponse,  errorResponse } = require('../../responseFormatter');

exports.getAll = async (req, res) => {
  try {
    const { date } = req.query;
    const filter = date ? { date } : {};
    const records = await MessAttendance.find(filter).sort({ createdAt: -1 }).lean();
    return successResponse(res, records, 'Mess attendance fetched');
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
    const record = new MessAttendance({ ...req.body, date: req.body.date || new Date().toISOString().split('T')[0] });
    await record.save();
    return successResponse(res, record, 'Added', 201);
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
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
