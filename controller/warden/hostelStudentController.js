const HostelStudent = require('../../model/HostelStudent');
const { successResponse,  errorResponse } = require('../../responseFormatter');

exports.getAll = async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};
    if (status && status !== 'All') filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { rollNumber: { $regex: search, $options: 'i' } },
        { course: { $regex: search, $options: 'i' } }
      ];
    }
    const students = await HostelStudent.find(filter).sort({ createdAt: -1 }).lean();
    return successResponse(res, students, 'Students fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.create = async (req, res) => {
  try {
    const { rollNumber } = req.body;
    if (!req.body.name || !rollNumber) return errorResponse(res, 'name and rollNumber required', 400);

    const existing = await HostelStudent.findOne({ rollNumber });
    if (existing) return errorResponse(res, 'Roll number already exists', 400);

    const student = new HostelStudent({
      ...req.body,
      admissionDate: req.body.admissionDate || new Date().toISOString().split('T')[0]
    });
    await student.save();
    return successResponse(res, student, 'Student added successfully', 201);
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.update = async (req, res) => {
  try {
    const student = await HostelStudent.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!student) return errorResponse(res, 'Student not found', 404);
    return successResponse(res, student, 'Student updated');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.toggleStatus = async (req, res) => {
  try {
    const student = await HostelStudent.findById(req.params.id);
    if (!student) return errorResponse(res, 'Student not found', 404);
    student.status = student.status === 'Active' ? 'Inactive' : 'Active';
    await student.save();
    return successResponse(res, student, `Status updated to ${student.status}`);
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.remove = async (req, res) => {
  try {
    const student = await HostelStudent.findByIdAndDelete(req.params.id);
    if (!student) return errorResponse(res, 'Student not found', 404);
    return successResponse(res, null, 'Student deleted');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.getById = async (req, res) => {
  try {
    const student = await HostelStudent.findById(req.params.id).lean();
    if (!student) return errorResponse(res, 'Student not found', 404);
    return successResponse(res, student, 'Student fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.getStats = async (req, res) => {
  try {
    const [total, active, inactive] = await Promise.all([
      HostelStudent.countDocuments(),
      HostelStudent.countDocuments({ status: 'Active' }),
      HostelStudent.countDocuments({ status: 'Inactive' })
    ]);
    return successResponse(res, { total, active, inactive }, 'Stats fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};
