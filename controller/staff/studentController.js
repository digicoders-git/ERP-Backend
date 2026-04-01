const Student = require('../../model/Student');
const Admin = require('../../model/Admin');
const Approval = require('../../model/Approval');

// Get Student Profile with all details
exports.getStudentProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await Admin.findById(req.userId).lean();

    const student = await Student.findById(id)
      .populate('class', 'className')
      .populate('section', 'sectionName')
      .populate('branch', 'branchName')
      .lean();

    if (!student || student.branch._id.toString() !== admin.branch.toString()) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.status(200).json({ student });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Applications (Pending Admissions)
exports.getAllApplications = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', status = 'pending' } = req.query;
    const admin = await Admin.findById(req.userId).lean();
    const skip = (page - 1) * limit;

    const query = { 
      branch: admin.branch,
      applicationStatus: status
    };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { fatherName: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } }
      ];
    }

    const [applications, total] = await Promise.all([
      Student.find(query)
        .select('name fatherName mobile email class applicationStatus createdAt')
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
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Verify Student Documents
exports.verifyStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;
    const admin = await Admin.findById(req.userId).lean();

    const student = await Student.findById(id);
    if (!student || student.branch.toString() !== admin.branch.toString()) {
      return res.status(404).json({ message: 'Student not found' });
    }

    student.verificationStatus = status;
    student.verificationRemarks = remarks;
    student.verifiedBy = req.userId;
    student.verifiedAt = new Date();

    if (status === 'verified') {
      student.applicationStatus = 'approved';
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
    const { page = 1, limit = 20 } = req.query;
    const admin = await Admin.findById(req.userId).lean();
    const skip = (page - 1) * limit;

    const [students, total] = await Promise.all([
      Student.find({ 
        branch: admin.branch,
        applicationStatus: 'pending',
        verificationStatus: { $in: ['pending', null] }
      })
        .select('name fatherName mobile email documents createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Student.countDocuments({ 
        branch: admin.branch,
        applicationStatus: 'pending',
        verificationStatus: { $in: ['pending', null] }
      })
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
    const admin = await Admin.findById(req.userId).lean();

    const student = await Student.findById(id);
    if (!student || student.branch.toString() !== admin.branch.toString()) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Check if admission number already exists
    const existingStudent = await Student.findOne({ 
      admissionNumber, 
      branch: admin.branch 
    });
    if (existingStudent && existingStudent._id.toString() !== id) {
      return res.status(400).json({ message: 'Admission number already exists' });
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
    const { page = 1, limit = 20, classId, section } = req.query;
    const admin = await Admin.findById(req.userId).lean();
    const skip = (page - 1) * limit;

    const query = { 
      branch: admin.branch,
      applicationStatus: 'approved',
      status: { $ne: 'active' }
    };

    if (classId) query.class = classId;
    if (section) query.section = section;

    const [students, total] = await Promise.all([
      Student.find(query)
        .select('name fatherName mobile email class section createdAt')
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
    const admin = await Admin.findById(req.userId).lean();

    const student = await Student.findById(id);
    if (!student || student.branch.toString() !== admin.branch.toString()) {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (req.files) {
      const documents = {};
      if (req.files.marksheet) documents.marksheet = `/uploads/students/${req.files.marksheet[0].filename}`;
      if (req.files.characterCertificate) documents.characterCertificate = `/uploads/students/${req.files.characterCertificate[0].filename}`;
      if (req.files.transferCertificate) documents.transferCertificate = `/uploads/students/${req.files.transferCertificate[0].filename}`;
      if (req.files.birthCertificate) documents.birthCertificate = `/uploads/students/${req.files.birthCertificate[0].filename}`;
      if (req.files.aadharCard) documents.aadharCard = `/uploads/students/${req.files.aadharCard[0].filename}`;

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

// Get All Documents
exports.getAllDocuments = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const admin = await Admin.findById(req.userId).lean();
    const skip = (page - 1) * limit;

    const query = { branch: admin.branch, status: 'active' };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { admissionNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const [students, total] = await Promise.all([
      Student.find(query)
        .select('firstName lastName name admissionNumber class section documents')
        .populate('class', 'className')
        .populate('section', 'sectionName')
        .sort({ name: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Student.countDocuments(query)
    ]);

    // Format response
    const formattedStudents = students.map(student => ({
      _id: student._id,
      name: student.name || `${student.firstName} ${student.lastName}`,
      admissionNumber: student.admissionNumber,
      class: student.class,
      section: student.section,
      documents: student.documents
    }));

    res.status(200).json({
      students: formattedStudents,
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
