const LeaveGatePass = require('../../model/LeaveGatePass');
const { successResponse,  errorResponse } = require('../../responseFormatter');

exports.getAll = async (req, res) => {
  try {
    const { status, requestType } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (requestType) filter.requestType = requestType;

    const HostelStudent = require('../../model/HostelStudent');
    const Student = require('../../model/Student');

    const BedAllocation = require('../../model/BedAllocation');
    const requests = await LeaveGatePass.find(filter).sort({ createdAt: -1 }).lean();

    // Self-healing: Populate latest student info for each request
    const enrichedRequests = await Promise.all(requests.map(async (item) => {
      // 1. Try Hostel Database
      let student = await HostelStudent.findById(item.studentId).lean();
      
      // 2. Try Main School Database (Legacy)
      if (!student) {
        student = await Student.findById(item.studentId).lean();
      }

      // 3. Fetch current room/bed
      const allotment = await BedAllocation.findOne({ studentId: item.studentId }).lean();

      const currentName = student ? (student.name || `${student.firstName} ${student.lastName}`) : item.studentName;
      const rollNumber = student ? (student.rollNumber || student.rollNo || 'N/A') : 'N/A';

      return {
        ...item,
        studentName: currentName,
        rollNumber: rollNumber,
        roomNumber: allotment ? allotment.roomNumber : 'N/A',
        bedNumber: allotment ? allotment.bedNumber : 'A'
      };
    }));

    return successResponse(res, enrichedRequests, 'Requests fetched with fresh data');
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

exports.updateStatus = async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return errorResponse(res, 'Invalid status', 400);
    }

    const updateData = {
      status,
      approvedBy: 'Warden',
      approvalDate: new Date().toISOString().split('T')[0]
    };

    if (rejectionReason) updateData.rejectionReason = rejectionReason;

    const request = await LeaveGatePass.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!request) return errorResponse(res, 'Not found', 404);
    
    return successResponse(res, request, `Pass ${status.charAt(0).toUpperCase() + status.slice(1)}`);
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.approve = async (req, res) => {
  req.body.status = 'approved';
  return exports.updateStatus(req, res);
};

exports.reject = async (req, res) => {
  req.body.status = 'rejected';
  return exports.updateStatus(req, res);
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
