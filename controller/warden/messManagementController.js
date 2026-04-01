const MessAttendance = require('../../model/MessAttendance');
const HostelComplaint = require('../../model/HostelComplaint');
const { successResponse,  errorResponse } = require('../../responseFormatter');

// Combined mess data - menu + attendance + complaints in one call
exports.getMessData = async (req, res) => {
  try {
    const { date } = req.query;
    const today = date || new Date().toISOString().split('T')[0];

    const [attendance, complaints] = await Promise.all([
      MessAttendance.find({ date: today }).sort({ createdAt: -1 }).lean(),
      HostelComplaint.find({ category: 'Mess' }).sort({ createdAt: -1 }).limit(20).lean()
    ]);

    return successResponse(res, { attendance, complaints }, 'Mess data fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

// Public complaint submit - no auth (for QR code link)
exports.submitPublicComplaint = async (req, res) => {
  try {
    const { studentName, studentId, complaint, category } = req.body;
    if (!studentName || !complaint) return errorResponse(res, 'studentName and complaint required', 400);

    const newComplaint = new HostelComplaint({
      studentName,
      studentId: studentId || '',
      complaint,
      category: category || 'Mess',
      status: 'pending',
      date: new Date().toISOString().split('T')[0]
    });
    await newComplaint.save();
    return successResponse(res, newComplaint, 'Complaint submitted successfully', 201);
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

// Get QR config - returns complaint form URL for QR generation
exports.getQRConfig = async (req, res) => {
  try {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const complaintUrl = `${baseUrl}/mess-complaint`;
    const apiUrl = `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/warden-panel/mess/public-complaint`;

    return successResponse(res, {
      complaintUrl,
      apiUrl,
      instructions: [
        'Share this link with students',
        'Students can submit complaints directly',
        'Print QR code and display in mess hall',
        'All complaints appear in Complaints section'
      ]
    }, 'QR config fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};
