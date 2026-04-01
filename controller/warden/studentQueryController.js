const StudentQuery = require('../../model/StudentQuery');
const { successResponse, errorResponse } = require('../../responseFormatter');

exports.getAll = async (req, res) => {
  try {
    const { status, category } = req.query;
    const filter = {};
    if (status && status !== 'All') filter.status = status;
    if (category && category !== 'All') filter.category = category;
    const queries = await StudentQuery.find(filter).sort({ createdAt: -1 }).lean();
    return successResponse(res, queries, 'Queries fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.create = async (req, res) => {
  try {
    const query = new StudentQuery({ ...req.body, submittedDate: new Date().toISOString().split('T')[0] });
    await query.save();
    return successResponse(res, query, 'Query submitted', 201);
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.reply = async (req, res) => {
  try {
    const { reply } = req.body;
    const query = await StudentQuery.findByIdAndUpdate(
      req.params.id,
      { reply, status: 'Resolved', repliedDate: new Date().toISOString().split('T')[0] },
      { new: true }
    );
    if (!query) return errorResponse(res, 'Not found', 404);
    return successResponse(res, query, 'Reply sent');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const query = await StudentQuery.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    if (!query) return errorResponse(res, 'Not found', 404);
    return successResponse(res, query, 'Status updated');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.remove = async (req, res) => {
  try {
    const query = await StudentQuery.findByIdAndDelete(req.params.id);
    if (!query) return errorResponse(res, 'Not found', 404);
    return successResponse(res, null, 'Deleted');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.getStats = async (req, res) => {
  try {
    const [total, pending, inProgress, resolved] = await Promise.all([
      StudentQuery.countDocuments(),
      StudentQuery.countDocuments({ status: 'Pending' }),
      StudentQuery.countDocuments({ status: 'In Progress' }),
      StudentQuery.countDocuments({ status: 'Resolved' })
    ]);
    return successResponse(res, { total, pending, inProgress, resolved }, 'Stats fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};
