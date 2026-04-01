const BookRequest = require('../../model/BookRequest');
const { successResponse, errorResponse } = require('../../responseFormatter');

exports.getAllRequests = async (req, res) => {
  try {
    const requests = await BookRequest.find()
      .populate('student', 'name email')
      .populate('book', 'title author')
      .sort({ requestDate: -1 });
    
    return successResponse(res, requests, 'Book requests fetched successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.getRequestById = async (req, res) => {
  try {
    const request = await BookRequest.findById(req.params.id)
      .populate('student', 'name email')
      .populate('book', 'title author');
    
    if (!request) {
      return errorResponse(res, 'Book request not found', 404);
    }
    
    return successResponse(res, request, 'Book request fetched successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.createRequest = async (req, res) => {
  try {
    const { studentName, studentId, bookTitle, priority, branch, client } = req.body;

    if (!studentName || !studentId || !bookTitle) {
      return errorResponse(res, 'Required fields missing', 400);
    }

    const request = new BookRequest({
      studentName,
      studentId,
      bookTitle,
      priority: priority || 'Medium',
      status: 'Pending',
      requestDate: new Date(),
      branch: branch || undefined,
      client: client || undefined
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
    const request = await BookRequest.findById(req.params.id);

    if (!request) {
      return errorResponse(res, 'Book request not found', 404);
    }

    request.status = 'Approved';
    request.approvedBy = approvedBy || 'Librarian';
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
    const request = await BookRequest.findById(req.params.id);

    if (!request) {
      return errorResponse(res, 'Book request not found', 404);
    }

    request.status = 'Rejected';
    request.rejectionReason = rejectionReason || 'Not available';
    request.approvedBy = approvedBy || 'Librarian';
    request.approvalDate = new Date();

    await request.save();
    return successResponse(res, request, 'Book request rejected successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.fulfillRequest = async (req, res) => {
  try {
    const request = await BookRequest.findById(req.params.id);

    if (!request) {
      return errorResponse(res, 'Book request not found', 404);
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

    if (!['Pending', 'Approved', 'Rejected', 'Fulfilled'].includes(status)) {
      return errorResponse(res, 'Invalid status', 400);
    }

    const requests = await BookRequest.find({ status })
      .populate('student', 'name email')
      .populate('book', 'title author')
      .sort({ requestDate: -1 });

    return successResponse(res, requests, `${status} requests fetched`);
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.getRequestsByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;

    const requests = await BookRequest.find({ studentId })
      .populate('book', 'title author')
      .sort({ requestDate: -1 });

    return successResponse(res, requests, 'Student requests fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.deleteRequest = async (req, res) => {
  try {
    const request = await BookRequest.findByIdAndDelete(req.params.id);

    if (!request) {
      return errorResponse(res, 'Book request not found', 404);
    }

    return successResponse(res, null, 'Book request deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.getRequestStats = async (req, res) => {
  try {
    const totalRequests = await BookRequest.countDocuments();
    const pendingRequests = await BookRequest.countDocuments({ status: 'Pending' });
    const approvedRequests = await BookRequest.countDocuments({ status: 'Approved' });
    const rejectedRequests = await BookRequest.countDocuments({ status: 'Rejected' });
    const fulfilledRequests = await BookRequest.countDocuments({ status: 'Fulfilled' });

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
