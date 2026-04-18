const BookRequest = require('../../model/BookRequest');
const Admin = require('../../model/Admin');
const { successResponse, errorResponse } = require('../../responseFormatter');

exports.getAllRequests = async (req, res) => {
  try {
    const adminId = req.userId;
    
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return errorResponse(res, 'Admin not found', 404);
    }

    const requests = await BookRequest.find({ branch: admin.branch })
      .populate('student', 'name email')
      .populate('book', 'title author')
      .sort({ requestDate: -1 })
      .lean();
    
    return successResponse(res, requests, 'Book requests fetched successfully');
  } catch (error) {
    console.error('Error fetching book requests:', error);
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.getRequestById = async (req, res) => {
  try {
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return errorResponse(res, 'Admin not found', 404);
    }

    const request = await BookRequest.findById(req.params.id)
      .populate('student', 'name email')
      .populate('book', 'title author')
      .lean();
    
    if (!request) {
      return errorResponse(res, 'Book request not found', 404);
    }

    if (request.branch.toString() !== admin.branch.toString()) {
      return errorResponse(res, 'Access denied', 403);
    }
    
    return successResponse(res, request, 'Book request fetched successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.createRequest = async (req, res) => {
  try {
    const { studentName, studentId, bookTitle, priority } = req.body;
    const adminId = req.userId;

    if (!studentName || !studentId || !bookTitle) {
      return errorResponse(res, 'Required fields missing', 400);
    }

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return errorResponse(res, 'Admin not found', 404);
    }

    const request = new BookRequest({
      studentName,
      studentId,
      bookTitle,
      priority: priority || 'Medium',
      status: 'Pending',
      requestDate: new Date(),
      branch: admin.branch,
      client: admin.client
    });

    await request.save();
    return successResponse(res, request, 'Book request created successfully', 201);
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.approveRequest = async (req, res) => {
  try {
    const { approvedBy } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return errorResponse(res, 'Admin not found', 404);
    }

    const request = await BookRequest.findById(req.params.id);

    if (!request) {
      return errorResponse(res, 'Book request not found', 404);
    }

    if (request.branch.toString() !== admin.branch.toString()) {
      return errorResponse(res, 'Access denied', 403);
    }

    request.status = 'Approved';
    request.approvedBy = approvedBy || admin.name || 'Librarian';
    request.approvalDate = new Date();

    await request.save();
    return successResponse(res, request, 'Book request approved successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.rejectRequest = async (req, res) => {
  try {
    const { rejectionReason, approvedBy } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return errorResponse(res, 'Admin not found', 404);
    }

    const request = await BookRequest.findById(req.params.id);

    if (!request) {
      return errorResponse(res, 'Book request not found', 404);
    }

    if (request.branch.toString() !== admin.branch.toString()) {
      return errorResponse(res, 'Access denied', 403);
    }

    request.status = 'Rejected';
    request.rejectionReason = rejectionReason || 'Not available';
    request.approvedBy = approvedBy || admin.name || 'Librarian';
    request.approvalDate = new Date();

    await request.save();
    return successResponse(res, request, 'Book request rejected successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.fulfillRequest = async (req, res) => {
  try {
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return errorResponse(res, 'Admin not found', 404);
    }

    const request = await BookRequest.findById(req.params.id);

    if (!request) {
      return errorResponse(res, 'Book request not found', 404);
    }

    if (request.branch.toString() !== admin.branch.toString()) {
      return errorResponse(res, 'Access denied', 403);
    }

    if (request.status !== 'Approved') {
      return errorResponse(res, 'Only approved requests can be fulfilled', 400);
    }

    request.status = 'Fulfilled';
    await request.save();

    return successResponse(res, request, 'Book request fulfilled successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.getRequestsByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const adminId = req.userId;

    if (!['Pending', 'Approved', 'Rejected', 'Fulfilled'].includes(status)) {
      return errorResponse(res, 'Invalid status', 400);
    }

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return errorResponse(res, 'Admin not found', 404);
    }

    const requests = await BookRequest.find({ status, branch: admin.branch })
      .populate('student', 'name email')
      .populate('book', 'title author')
      .sort({ requestDate: -1 })
      .lean();

    return successResponse(res, requests, `${status} requests fetched`);
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.getRequestsByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return errorResponse(res, 'Admin not found', 404);
    }

    const requests = await BookRequest.find({ studentId, branch: admin.branch })
      .populate('book', 'title author')
      .sort({ requestDate: -1 })
      .lean();

    return successResponse(res, requests, 'Student requests fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.deleteRequest = async (req, res) => {
  try {
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return errorResponse(res, 'Admin not found', 404);
    }

    const request = await BookRequest.findById(req.params.id);

    if (!request) {
      return errorResponse(res, 'Book request not found', 404);
    }

    if (request.branch.toString() !== admin.branch.toString()) {
      return errorResponse(res, 'Access denied', 403);
    }

    await BookRequest.findByIdAndDelete(req.params.id);

    return successResponse(res, null, 'Book request deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.getRequestStats = async (req, res) => {
  try {
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return errorResponse(res, 'Admin not found', 404);
    }

    const query = { branch: admin.branch };
    const totalRequests = await BookRequest.countDocuments(query);
    const pendingRequests = await BookRequest.countDocuments({ ...query, status: 'Pending' });
    const approvedRequests = await BookRequest.countDocuments({ ...query, status: 'Approved' });
    const rejectedRequests = await BookRequest.countDocuments({ ...query, status: 'Rejected' });
    const fulfilledRequests = await BookRequest.countDocuments({ ...query, status: 'Fulfilled' });

    const stats = {
      totalRequests,
      pendingRequests,
      approvedRequests,
      rejectedRequests,
      fulfilledRequests
    };

    return successResponse(res, stats, 'Request statistics fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};
