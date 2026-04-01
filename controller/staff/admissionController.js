const Student = require('../../model/Student');
const Class = require('../../model/Class');
const Section = require('../../model/Section');
const Admin = require('../../model/Admin');

// Add New Admission
exports.addAdmission = async (req, res) => {
  try {
    const {
      firstName, lastName, email, phone, gender, dob, category,
      permanentAddress, permanentCity, permanentState, permanentPincode,
      currentAddress, currentCity, currentState, currentPincode,
      hasPreviousEducation, previousSchoolName, previousPercentage,
      classId, sectionId,
      fatherName, motherName, guardianPhone, emergencyPhone
    } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || admin.role !== 'staffAdmin') {
      return res.status(403).json({ message: 'Only staff can add admissions' });
    }

    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }

    if (classData.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Class does not belong to your branch' });
    }

    const section = await Section.findById(sectionId);
    if (!section) {
      return res.status(404).json({ message: 'Section not found' });
    }

    if (section.assignToClass.toString() !== classId) {
      return res.status(400).json({ message: 'Section does not belong to the selected class' });
    }

    if (section.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Section does not belong to your branch' });
    }

    if (hasPreviousEducation === 'yes' && (!previousSchoolName || !previousPercentage)) {
      return res.status(400).json({ message: 'Previous school details are required when hasPreviousEducation is yes' });
    }

    const studentData = {
      firstName,
      lastName,
      email,
      phone,
      gender,
      dob,
      category,
      profileImage: req.files?.profileImage ? req.files.profileImage[0].path : undefined,
      permanentAddress: {
        address: permanentAddress,
        city: permanentCity,
        state: permanentState,
        pincode: permanentPincode
      },
      currentAddress: {
        address: currentAddress,
        city: currentCity,
        state: currentState,
        pincode: currentPincode
      },
      hasPreviousEducation,
      class: classId,
      section: sectionId,
      guardianInfo: {
        fatherName,
        motherName,
        guardianPhone,
        emergencyPhone
      },
      branch: admin.branch,
      client: admin.client,
      createdBy: adminId
    };

    if (hasPreviousEducation === 'yes') {
      studentData.previousEducation = {
        previousSchoolName,
        previousPercentage,
        marksheet: req.files?.marksheet ? req.files.marksheet[0].path : undefined,
        characterCertificate: req.files?.characterCertificate ? req.files.characterCertificate[0].path : undefined,
        transferCertificate: req.files?.transferCertificate ? req.files.transferCertificate[0].path : undefined
      };
    }

    const newStudent = new Student(studentData);
    await newStudent.save();
    res.status(201).json({ message: 'Student admission added successfully', student: newStudent });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Admissions
exports.getAllAdmissions = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = '', classId = '' } = req.query;
    const skip = (page - 1) * limit;
    const adminId = req.userId;
    const admin = await Admin.findById(adminId);

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const searchQuery = {};

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

    let students, total;
    if (admin.role === 'staffAdmin') {
      searchQuery.branch = admin.branch;
      students = await Student.find(searchQuery)
        .populate('class', 'className classCode')
        .populate('section', 'sectionName')
        .populate('branch', 'branchName branchCode')
        .populate('createdBy', 'email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      total = await Student.countDocuments(searchQuery);
    } else if (admin.role === 'branchAdmin') {
      searchQuery.branch = admin.branch;
      students = await Student.find(searchQuery)
        .populate('class', 'className classCode')
        .populate('section', 'sectionName')
        .populate('branch', 'branchName branchCode')
        .populate('createdBy', 'email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      total = await Student.countDocuments(searchQuery);
    } else if (admin.role === 'clientAdmin') {
      searchQuery.client = admin.client;
      students = await Student.find(searchQuery)
        .populate('class', 'className classCode')
        .populate('section', 'sectionName')
        .populate('branch', 'branchName branchCode')
        .populate('createdBy', 'email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      total = await Student.countDocuments(searchQuery);
    } else {
      students = await Student.find(searchQuery)
        .populate('class', 'className classCode')
        .populate('section', 'sectionName')
        .populate('branch', 'branchName branchCode')
        .populate('client', 'name')
        .populate('createdBy', 'email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      total = await Student.countDocuments(searchQuery);
    }

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

// Get Admission By ID
exports.getAdmissionById = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
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

    if (admin.role === 'staffAdmin' && student.branch._id.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (admin.role === 'branchAdmin' && student.branch._id.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (admin.role === 'clientAdmin' && student.client._id.toString() !== admin.client.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.status(200).json({ student });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
