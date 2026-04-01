const LeaveGatePass = require('../../model/LeaveGatePass');
const { successResponse,  errorResponse } = require('../../responseFormatter');

exports.getAll = async (req, res) => {
  try {
    const { status, requestType } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (requestType) filter.requestType = requestType;
    const requests = await LeaveGatePass.find(filter).sort({ createdAt: -1 }).lean();
    return successResponse(res, requests, 'Requests fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.create = async (req, res) => {
  try {
    const request = new LeaveGatePass({ ...req.body, createdDate: new Date().toISOString().split('T')[0] });
    await request.save();
    return successResponse(res, request, 'Request submitted', 201);
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.update = async (req, res) => {
  try {
    const request = await LeaveGatePass.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!request) return errorResponse(res, 'Not found', 404);
    return successResponse(res, request, 'Updated');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.approve = async (req, res) => {
  try {
    const request = await LeaveGatePass.findByIdAndUpdate(
      req.params.id,
      { status: 'approved', approvedBy: req.body.approvedBy || 'Warden', approvalDate: new Date().toISOString().split('T')[0] },
      { new: true }
    );
    if (!request) return errorResponse(res, 'Not found', 404);
    return successResponse(res, request, 'Approved');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.reject = async (req, res) => {
  try {
    const request = await LeaveGatePass.findByIdAndUpdate(
      req.params.id,
      {
        status: 'rejected',
        rejectionReason: req.body.rejectionReason,
        approvedBy: req.body.approvedBy || 'Warden',
        approvalDate: new Date().toISOString().split('T')[0]
      },
      { new: true }
    );
    if (!request) return errorResponse(res, 'Not found', 404);
    return successResponse(res, request, 'Rejected');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.remove = async (req, res) => {
  try {
    const request = await LeaveGatePass.findByIdAndDelete(req.params.id);
    if (!request) return errorResponse(res, 'Not found', 404);
    return successResponse(res, null, 'Deleted');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.getStats = async (req, res) => {
  try {
    const [total, pending, approved, rejected] = await Promise.all([
      LeaveGatePass.countDocuments(),
      LeaveGatePass.countDocuments({ status: 'pending' }),
      LeaveGatePass.countDocuments({ status: 'approved' }),
      LeaveGatePass.countDocuments({ status: 'rejected' })
    ]);
    return successResponse(res, { total, pending, approved, rejected }, 'Stats fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};
