const Visitor = require('../../model/Visitor');
const { successResponse,  errorResponse } = require('../../responseFormatter');

exports.getAll = async (req, res) => {
  try {
    const { date, status } = req.query;
    const filter = {};
    if (date) filter.date = date;
    if (status) filter.status = status;
    const visitors = await Visitor.find(filter).sort({ createdAt: -1 }).lean();
    return successResponse(res, visitors, 'Visitors fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.create = async (req, res) => {
  try {
    const visitor = new Visitor({ ...req.body, date: req.body.date || new Date().toISOString().split('T')[0] });
    await visitor.save();
    return successResponse(res, visitor, 'Visitor registered', 201);
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.update = async (req, res) => {
  try {
    const visitor = await Visitor.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!visitor) return errorResponse(res, 'Not found', 404);
    return successResponse(res, visitor, 'Updated');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.checkOut = async (req, res) => {
  try {
    const visitor = await Visitor.findByIdAndUpdate(
      req.params.id,
      { status: 'checked-out', checkOutTime: new Date().toISOString().slice(0, 16) },
      { new: true }
    );
    if (!visitor) return errorResponse(res, 'Not found', 404);
    return successResponse(res, visitor, 'Visitor checked out');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.remove = async (req, res) => {
  try {
    const visitor = await Visitor.findByIdAndDelete(req.params.id);
    if (!visitor) return errorResponse(res, 'Not found', 404);
    return successResponse(res, null, 'Deleted');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.getStats = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [total, checkedIn, checkedOut, todayCount] = await Promise.all([
      Visitor.countDocuments(),
      Visitor.countDocuments({ status: 'checked-in' }),
      Visitor.countDocuments({ status: 'checked-out' }),
      Visitor.countDocuments({ date: today })
    ]);
    return successResponse(res, { total, checkedIn, checkedOut, todayCount }, 'Stats fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};
