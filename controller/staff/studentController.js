const Student = require('../../model/Student');
const Staff = require('../../model/Staff');
const Admin = require('../../model/Admin');
const Approval = require('../../model/Approval');
const StudentDocument = require('../../model/StudentDocument');

const getBranchClient = async (userId) => {
  let user = await Staff.findById(userId).select('branch client').lean();
  if (!user) {
    user = await Admin.findById(userId).select('branch client').lean();
  }
  if (!user) {
    throw new Error('User not found or unauthorized');
  }
  return user;
};

// Get Student Profile with all details
exports.getStudentProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { branch } = await getBranchClient(req.userId);

    const student = await Student.findById(id)
      .populate('class', 'className')
      .populate('section', 'sectionName')
      .populate('branch', 'branchName')
      .lean();

    if (!student || student.branch._id.toString() !== branch.toString()) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Format complete student profile with all details
    const formattedStudent = {
      _id: student._id,
      
      // Personal Information
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      phone: student.phone,
      mobile: student.mobile,
      gender: student.gender,
      dob: student.dob ? new Date(student.dob).toISOString().split('T')[0] : null,
      dobFormatted: student.dob ? new Date(student.dob).toLocaleDateString('en-IN', { year: 'numeric', month: '2-digit', day: '2-digit' }) : null,
      bloodGroup: student.bloodGroup,
      category: student.category,
      profileImage: student.profileImage,
      
      // Academic Information
      admissionNumber: student.admissionNumber,
      rollNumber: student.rollNumber,
      stream: student.stream,
      class: student.class,
      section: student.section,
      status: student.status,
      applicationStatus: student.applicationStatus,
      admissionStatus: student.admissionStatus,
      
      // Family Information
      fatherName: student.fatherName,
      motherName: student.motherName,
      guardianInfo: student.guardianInfo,
      
      // Address Information
      permanentAddress: student.permanentAddress,
      currentAddress: student.currentAddress,
      
      // Previous Education
      hasPreviousEducation: student.hasPreviousEducation,
      previousEducation: student.previousEducation,
      
      // Documents
      documents: student.documents,
      medicalCertificate: student.medicalCertificate,
      casteCertificate: student.casteCertificate,
      
      // Verification Details
      verificationStatus: student.verificationStatus,
      verificationRemarks: student.verificationRemarks,
      verifiedBy: student.verifiedBy,
      verifiedAt: student.verifiedAt,
      
      // Enrollment Details
      enrolledBy: student.enrolledBy,
      enrolledAt: student.enrolledAt,
      
      // System Information
      branch: student.branch,
      client: student.client,
      createdBy: student.createdBy,
      createdAt: student.createdAt,
      updatedAt: student.updatedAt
    };

    res.status(200).json({ 
      success: true,
      student: formattedStudent 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Applications (Pending Admissions)
exports.getAllApplications = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', status = '' } = req.query;
    const { branch } = await getBranchClient(req.userId);

    const skip = (page - 1) * limit;

    const query = { 
      branch
    };

    if (status && status !== 'all') {
      query.applicationStatus = status;
    }

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { fatherName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
        { admissionNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const [applications, total] = await Promise.all([
      Student.find(query)
        .select('firstName lastName fatherName mobile email class applicationStatus admissionStatus createdAt')
        .populate('class', 'className')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Student.countDocuments(query)
    ]);

    res.status(200).json({
      applications,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('getAllApplications error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Verify Student Documents
exports.verifyStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;
    const { branch } = await getBranchClient(req.userId);

    const student = await Student.findById(id);
    if (!student || student.branch.toString() !== branch.toString()) {
      return res.status(404).json({ message: 'Student not found' });
    }

    student.verificationStatus = status;
    student.verificationRemarks = remarks;
    student.verifiedBy = req.userId;
    student.verifiedAt = new Date();

    if (status === 'verified') {
      student.applicationStatus = 'approved';
    } else if (status === 'rejected') {
      student.applicationStatus = 'rejected';
      student.admissionStatus = 'rejected';
    }

    await student.save();

    res.status(200).json({ 
      message: 'Student verification updated successfully',
      student 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Students for Verification
exports.getVerificationList = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', status = '' } = req.query;
    const { branch } = await getBranchClient(req.userId);

    const skip = (page - 1) * limit;

    const query = { 
      branch
    };

    if (status) {
      query.verificationStatus = status;
    }

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
        { admissionNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const [students, total] = await Promise.all([
      Student.find(query)
        .select('firstName lastName fatherName mobile email documents applicationStatus verificationStatus createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Student.countDocuments(query)
    ]);

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

// Enroll Student (Final Admission)
exports.enrollStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { admissionNumber, rollNumber, class: classId, section } = req.body;
    const { branch } = await getBranchClient(req.userId);

    const student = await Student.findById(id);
    if (!student || student.branch.toString() !== branch.toString()) {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (student.applicationStatus === 'rejected') {
      return res.status(400).json({ 
        message: 'Protocol Violation: Rejected students cannot be manifested in the academic matrix.' 
      });
    }

    const existingStudent = await Student.findOne({ 
      admissionNumber, 
      branch
    });
    if (existingStudent && existingStudent._id.toString() !== id) {
      return res.status(400).json({ message: 'Institutional Registry Error: Admission number already exists' });
    }

    const duplicateRoll = await Student.findOne({
      rollNumber,
      class: classId,
      section: section,
      branch,
      _id: { $ne: id }
    });

    if (duplicateRoll) {
      return res.status(400).json({ 
        message: `Academic Matrix Conflict: Roll Number ${rollNumber} is already occupied in this section.` 
      });
    }

    student.admissionNumber = admissionNumber;
    student.rollNumber = rollNumber;
    student.class = classId;
    student.section = section;
    student.status = 'active';
    student.applicationStatus = 'enrolled';
    student.enrolledAt = new Date();
    student.enrolledBy = req.userId;

    await student.save();

    res.status(200).json({ 
      message: 'Student enrolled successfully',
      student 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Enrollment List
exports.getEnrollmentList = async (req, res) => {
  try {
    const { page = 1, limit = 20, classId, section, search = '', status = '' } = req.query;
    const { branch } = await getBranchClient(req.userId);

    const skip = (page - 1) * limit;

    const query = { 
      branch
    };

    if (status) query.applicationStatus = status;
    if (classId) query.class = classId;
    if (section) query.section = section;

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
        { admissionNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const [students, total] = await Promise.all([
      Student.find(query)
        .select('firstName lastName fatherName mobile email class section applicationStatus admissionStatus createdAt')
        .populate('class', 'className')
        .populate('section', 'sectionName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Student.countDocuments(query)
    ]);

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

// Upload/Update Student Documents
exports.uploadDocuments = async (req, res) => {
  try {
    const { id } = req.params;
    const { branch } = await getBranchClient(req.userId);

    const student = await Student.findById(id);
    if (!student || student.branch.toString() !== branch.toString()) {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (req.files) {
      const documents = {};
      if (req.files.marksheet) documents.marksheet = req.files.marksheet[0].cloudinaryUrl || `/uploads/students/${req.files.marksheet[0].filename}`;
      if (req.files.characterCertificate) documents.characterCertificate = req.files.characterCertificate[0].cloudinaryUrl || `/uploads/students/${req.files.characterCertificate[0].filename}`;
      if (req.files.transferCertificate) documents.transferCertificate = req.files.transferCertificate[0].cloudinaryUrl || `/uploads/students/${req.files.transferCertificate[0].filename}`;
      if (req.files.birthCertificate) documents.birthCertificate = req.files.birthCertificate[0].cloudinaryUrl || `/uploads/students/${req.files.birthCertificate[0].filename}`;
      if (req.files.aadharCard) documents.aadharCard = req.files.aadharCard[0].cloudinaryUrl || `/uploads/students/${req.files.aadharCard[0].filename}`;

      student.documents = { ...student.documents, ...documents };
      await student.save();
    }

    res.status(200).json({ 
      message: 'Documents uploaded successfully',
      documents: student.documents 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Student Documents with Stats
exports.getAllDocuments = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const { branch } = await getBranchClient(req.userId);
    
    const query = { branch };

    if (search) {
      query.$or = [
        { studentName: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } },
        { type: { $regex: search, $options: 'i' } }
      ];
    }

    const [documents, stats] = await Promise.all([
      StudentDocument.find(query)
        .sort({ createdAt: -1 })
        .lean(),
      StudentDocument.aggregate([
        { $match: { branch } },
        { 
          $group: { 
            _id: null,
            total: { $sum: 1 },
            verified: { $sum: { $cond: [{ $eq: ['$status', 'verified'] }, 1, 0] } },
            pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
            rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } }
          }
        }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: documents,
      stats: stats[0] || { total: 0, verified: 0, pending: 0, rejected: 0 }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Update Document Verification Status
exports.updateDocumentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { branch } = await getBranchClient(req.userId);

    const document = await StudentDocument.findById(id);
    if (!document || document.branch.toString() !== branch.toString()) {
      return res.status(404).json({ success: false, message: 'Institutional artifact not found.' });
    }

    document.status = status;
    await document.save();

    res.status(200).json({ 
      success: true, 
      message: `Document status manifested as ${status}`, 
      data: document 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Status sync failure', error: error.message });
  }
};
