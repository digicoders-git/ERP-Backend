const Student = require('../../model/Student');
const Class = require('../../model/Class');
const Section = require('../../model/Section');
const Staff = require('../../model/Staff');
const StudentDocument = require('../../model/StudentDocument');

// Add New Admission
exports.addAdmission = async (req, res) => {
  try {
    const {
      firstName, lastName, email, phone, gender, dob, category,
      permanentAddress, permanentCity, permanentState, permanentPincode,
      currentAddress, currentCity, currentState, currentPincode,
      hasPreviousEducation, prevCourseName, prevSchoolName, prevSchoolAddress,
      prevMarksType, prevMarksValue,
      course, section, stream,
      fatherName, motherName, guardianPhone, emergencyContact
    } = req.body;
    const staffId = req.userId;

    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(403).json({ message: 'Authorization Failure: Staff not found' });
    }

    if (!firstName || !lastName || !email || !phone || !course || !section) {
      return res.status(400).json({ message: 'Data Incomplete: Essential nomenclature and institutional matrix fields (Class/Section) are required.' });
    }

    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(course) || !mongoose.Types.ObjectId.isValid(section)) {
      return res.status(400).json({ message: 'Invalid Format: Class or Section ID protocol failure.' });
    }

    const classId = course;
    const sectionId = section;
    const actualStream = stream;

    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({ message: 'Institutional Registry Error: Class not found in this branch matrix.' });
    }

    const sectionData = await Section.findById(sectionId);
    if (!sectionData) {
      return res.status(404).json({ message: 'Institutional Registry Error: Section not found in this branch matrix.' });
    }

    const getFilePath = (fieldName) => {
      if (!req.files || !req.files[fieldName]) return undefined;
      const file = req.files[fieldName][0];
      if (file.cloudinaryUrl) return file.cloudinaryUrl;
      
      let cleanPath = file.path.replace(/\\\\/g, '/');
      const uploadsIndex = cleanPath.toLowerCase().indexOf('uploads/');
      if (uploadsIndex !== -1) {
        cleanPath = cleanPath.slice(uploadsIndex);
      }
      return cleanPath;
    };

    const studentData = {
      firstName,
      lastName,
      email,
      phone,
      gender,
      dob,
      category,
      fatherName,
      motherName,
      profileImage: getFilePath('studentPhoto'),
      medicalCertificate: getFilePath('medicalCertificate'),
      casteCertificate: getFilePath('fileCasteCertificate'),
      permanentAddress: {
        address: permanentAddress,
        city: permanentCity,
        state: permanentState,
        pincode: permanentPincode
      },
      currentAddress: {
        address: currentAddress || permanentAddress,
        city: currentCity || permanentCity,
        state: currentState || permanentState,
        pincode: currentPincode || permanentPincode
      },
      hasPreviousEducation,
      class: classId,
      section: sectionId,
      stream: actualStream,
      guardianInfo: {
        fatherName,
        motherName,
        guardianPhone,
        emergencyPhone: emergencyContact
      },
      documents: {
        marksheet: getFilePath('fileMarksheet'),
        characterCertificate: getFilePath('fileCharacterCert'),
        transferCertificate: getFilePath('fileTC'),
        birthCertificate: getFilePath('birthCertificate'),
        aadharCard: getFilePath('aadharCard')
      },
      branch: staff.branch,
      client: staff.client,
      createdBy: staffId,
      admissionStatus: 'pending',
      status: 'inactive'
    };

    if (hasPreviousEducation === 'yes') {
      studentData.previousEducation = {
        previousCourseName: prevCourseName,
        previousSchoolName: prevSchoolName,
        previousSchoolAddress: prevSchoolAddress,
        previousMarksType: prevMarksType,
        previousPercentage: parseFloat(prevMarksValue) || 0,
        marksheet: getFilePath('fileMarksheet'),
        characterCertificate: getFilePath('fileCharacterCert'),
        transferCertificate: getFilePath('fileTC'),
        migrationCertificate: getFilePath('fileMigrationCert')
      };
    }

    const newStudent = new Student(studentData);
    await newStudent.save();

    if (req.files) {
      const documentEntries = [];
      const studentFullName = `${firstName} ${lastName}`.trim();

      Object.keys(req.files).forEach(fieldName => {
        const file = req.files[fieldName][0];
        let docType = 'Other';

        if (fieldName === 'studentPhoto') docType = 'Photo';
        else if (fieldName === 'fileMarksheet') docType = 'Marksheet';
        else if (fieldName === 'fileTC') docType = 'Transfer Certificate';
        else if (fieldName === 'aadharCard') docType = 'ID Proof';
        else if (fieldName === 'birthCertificate') docType = 'ID Proof';
        else if (fieldName === 'fileCasteCertificate' || fieldName === 'casteCertificate') docType = 'ID Proof';
        
        documentEntries.push({
          studentName: studentFullName,
          studentId: newStudent.admissionNumber,
          type: docType,
          fileUrl: file.cloudinaryUrl || `/${file.path.replace(/\\\\/g, '/')}`, 
          fileName: file.originalname,
          fileSize: (file.size / 1024).toFixed(2) + ' KB',
          status: 'pending',
          branch: staff.branch,
          client: staff.client,
          createdBy: staffId
        });
      });

      if (documentEntries.length > 0) {
        await StudentDocument.insertMany(documentEntries);
      }
    }

    res.status(201).json({ message: 'PROTOCOL COMPLETE: Student Identity & Documents Synchronized', student: newStudent });
  } catch (error) {
    console.error('Admission Error Trace:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation Protocol Failure', errors: error.errors });
    }
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Data Conflict: Admission petition contains duplicate unique identifier (Email/Phone)' });
    }
    console.error('CRITICAL ADMISSION FAILURE:', error);
    res.status(500).json({ 
      message: 'System Internal Fault: Registry Sync Failed', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Get All Admissions
exports.getAllAdmissions = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = '', classId = '' } = req.query;
    const skip = (page - 1) * limit;
    const staffId = req.userId;
    const staff = await Staff.findById(staffId);

    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    const searchQuery = { branch: staff.branch };

    if (search) {
      searchQuery.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { admissionNumber: { $regex: search, $options: 'i' } }
      ];
    }

    if (status && ['pending', 'confirmed', 'rejected'].includes(status)) {
      searchQuery.admissionStatus = status;
    }

    if (classId) {
      searchQuery.class = classId;
    }

    const [students, total] = await Promise.all([
      Student.find(searchQuery)
        .populate('class', 'className classCode')
        .populate('section', 'sectionName')
        .populate('branch', 'branchName branchCode')
        .populate('createdBy', 'email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Student.countDocuments(searchQuery)
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

// Get Admission By ID
exports.getAdmissionById = async (req, res) => {
  try {
    const { id } = req.params;
    const staffId = req.userId;

    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    const student = await Student.findById(id)
      .populate('class', 'className classCode classCapacity')
      .populate('section', 'sectionName capacity')
      .populate('branch', 'branchName branchCode')
      .populate('client', 'name')
      .populate('createdBy', 'email')
      .lean();

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (student.branch._id.toString() !== staff.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
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

// Update Admission
exports.updateAdmission = async (req, res) => {
  try {
    const { id } = req.params;
    const staffId = req.userId;
    const staff = await Staff.findById(staffId);

    if (!staff) return res.status(404).json({ message: 'Staff not found' });

    let student = await Student.findById(id);
    if (!student) return res.status(404).json({ message: 'Manifest not found' });

    if (student.branch.toString() !== staff.branch.toString()) {
      return res.status(403).json({ message: 'Institutional Access Denied' });
    }

    const {
      firstName, lastName, email, phone, gender, dob, category,
      permanentAddress, permanentCity, permanentState, permanentPincode,
      currentAddress, currentCity, currentState, currentPincode,
      hasPreviousEducation, prevCourseName, prevSchoolName, prevSchoolAddress,
      prevMarksType, prevMarksValue,
      course, section, stream,
      fatherName, motherName, guardianPhone, emergencyContact
    } = req.body;

    const getFilePath = (fieldName) => {
      if (!req.files || !req.files[fieldName]) return undefined;
      const file = req.files[fieldName][0];
      if (file.cloudinaryUrl) return file.cloudinaryUrl;
      
      let cleanPath = file.path.replace(/\\\\/g, '/');
      const uploadsIndex = cleanPath.toLowerCase().indexOf('uploads/');
      if (uploadsIndex !== -1) cleanPath = cleanPath.slice(uploadsIndex);
      return cleanPath;
    };

    const updateData = {
      firstName, lastName, email, phone, gender, dob, category,
      fatherName, motherName,
      permanentAddress: {
        address: permanentAddress,
        city: permanentCity,
        state: permanentState,
        pincode: permanentPincode
      },
      currentAddress: {
        address: currentAddress || permanentAddress,
        city: currentCity || permanentCity,
        state: currentState || permanentState,
        pincode: currentPincode || permanentPincode
      },
      hasPreviousEducation,
      class: course,
      section: section,
      stream: stream,
      guardianInfo: {
        fatherName,
        motherName,
        guardianPhone,
        emergencyPhone: emergencyContact
      },
      admissionStatus: 'pending',
      applicationStatus: 'pending'
    };

    const photo = getFilePath('studentPhoto');
    if (photo) updateData.profileImage = photo;

    const medical = getFilePath('medicalCertificate');
    if (medical) updateData.medicalCertificate = medical;

    const caste = getFilePath('fileCasteCertificate');
    if (caste) updateData.casteCertificate = caste;

    const marksheet = getFilePath('fileMarksheet');
    const birthCert = getFilePath('birthCertificate');
    const aadhar = getFilePath('aadharCard');
    const characterCert = getFilePath('fileCharacterCert');
    const tc = getFilePath('fileTC');

    if (marksheet || birthCert || aadhar || characterCert || tc) {
      updateData.documents = { ...student.documents };
      if (marksheet) updateData.documents.marksheet = marksheet;
      if (birthCert) updateData.documents.birthCertificate = birthCert;
      if (aadhar) updateData.documents.aadharCard = aadhar;
      if (characterCert) updateData.documents.characterCertificate = characterCert;
      if (tc) updateData.documents.transferCertificate = tc;
    }

    if (hasPreviousEducation === 'yes') {
      updateData.previousEducation = {
        ...student.previousEducation,
        previousCourseName: prevCourseName,
        previousSchoolName: prevSchoolName,
        previousSchoolAddress: prevSchoolAddress,
        previousMarksType: prevMarksType,
        previousPercentage: parseFloat(prevMarksValue) || 0
      };
      if (marksheet) updateData.previousEducation.marksheet = marksheet;
      if (characterCert) updateData.previousEducation.characterCertificate = characterCert;
      if (tc) updateData.previousEducation.transferCertificate = tc;
      const migration = getFilePath('fileMigrationCert');
      if (migration) updateData.previousEducation.migrationCertificate = migration;
    }

    const updatedStudent = await Student.findByIdAndUpdate(id, { $set: updateData }, { new: true });
    res.status(200).json({ message: 'Manifest Updated Successfully', student: updatedStudent });
  } catch (error) {
    res.status(500).json({ message: 'Update Fault: Internal Server Protocol Error', error: error.message });
  }
};

// Delete Admission
exports.deleteAdmission = async (req, res) => {
  try {
    const { id } = req.params;
    const staffId = req.userId;
    const staff = await Staff.findById(staffId);

    if (!staff) return res.status(404).json({ message: 'Staff not found' });

    let student = await Student.findById(id);
    if (!student) return res.status(404).json({ message: 'Manifest not found' });

    if (student.branch.toString() !== staff.branch.toString()) {
      return res.status(403).json({ message: 'Institutional Access Denied' });
    }

    await Student.findByIdAndDelete(id);
    res.status(200).json({ message: 'PROTOCOL TERMINATED: Student Manifest Deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Decomissioning Fault', error: error.message });
  }
};
