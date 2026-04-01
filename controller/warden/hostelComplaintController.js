const HostelComplaint = require('../../model/HostelComplaint');
const { successResponse,  errorResponse } = require('../../responseFormatter');

exports.getAll = async (req, res) => {
  try {
    const { status, category } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    const complaints = await HostelComplaint.find(filter).sort({ createdAt: -1 }).lean();
    return successResponse(res, complaints, 'Complaints fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.create = async (req, res) => {
  try {
    const complaint = new HostelComplaint({ ...req.body, date: req.body.date || new Date().toISOString().split('T')[0] });
    await complaint.save();
    return successResponse(res, complaint, 'Complaint created', 201);
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.update = async (req, res) => {
  try {
    const update = { ...req.body };
    if (req.body.status === 'resolved') update.resolvedAt = new Date();
    const complaint = await HostelComplaint.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!complaint) return errorResponse(res, 'Not found', 404);
    return successResponse(res, complaint, 'Updated');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.remove = async (req, res) => {
  try {
    const complaint = await HostelComplaint.findByIdAndDelete(req.params.id);
    if (!complaint) return errorResponse(res, 'Not found', 404);
    return successResponse(res, null, 'Deleted');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.getStats = async (req, res) => {
  try {
    const [total, pending, resolved, inProgress] = await Promise.all([
      HostelComplaint.countDocuments(),
      HostelComplaint.countDocuments({ status: 'pending' }),
      HostelComplaint.countDocuments({ status: 'resolved' }),
      HostelComplaint.countDocuments({ status: 'in-progress' })
    ]);
    return successResponse(res, { total, pending, resolved, inProgress }, 'Stats fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};
