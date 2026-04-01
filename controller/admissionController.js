const Student = require('../model/Student');
const Admin = require('../model/Admin');

// Get All Admissions (Branch Admin)
exports.getAllAdmissions = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = '', classId = '' } = req.query;
    const skip = (page - 1) * limit;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || admin.role !== 'branchAdmin') {
      return res.status(403).json({ message: 'Only branch admin can view admissions' });
    }

    const searchQuery = { branch: admin.branch };

    // Global search
    if (search) {
      searchQuery.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    // Status filter
    if (status && ['pending', 'confirmed', 'rejected'].includes(status)) {
      searchQuery.admissionStatus = status;
    }

    // Class filter
    if (classId) {
      searchQuery.class = classId;
    }

    const students = await Student.find(searchQuery)
      .populate('class', 'className classCode')
      .populate('section', 'sectionName')
      .populate('branch', 'branchName branchCode')
      .populate('createdBy', 'email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Student.countDocuments(searchQuery);

    res.status(200).json({ 
      students, 
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Admission By ID (Branch Admin)
exports.getAdmissionById = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || admin.role !== 'branchAdmin') {
      return res.status(403).json({ message: 'Only branch admin can view admission details' });
    }

    const student = await Student.findById(id)
      .populate('class', 'className classCode classCapacity')
      .populate('section', 'sectionName capacity')
      .populate('branch', 'branchName branchCode')
      .populate('client', 'name')
      .populate('createdBy', 'email role');

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (student.branch._id.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.status(200).json({ student });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Admission Status (Branch Admin)
exports.updateAdmissionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { admissionStatus } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || admin.role !== 'branchAdmin') {
      return res.status(403).json({ message: 'Only branch admin can update admission status' });
    }

    if (!['pending', 'confirmed', 'rejected'].includes(admissionStatus)) {
      return res.status(400).json({ message: 'Invalid admission status. Must be pending, confirmed, or rejected' });
    }

    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (student.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    student.admissionStatus = admissionStatus;
    await student.save();

    res.status(200).json({ message: 'Admission status updated successfully', student });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
