const Student = require('../../model/Student');
const Admin = require('../../model/Admin');
const QRCode = require('qrcode');

// Generate ID Card Data
exports.generateIdCard = async (req, res) => {
  try {
    const { studentId } = req.params;
    const admin = await Admin.findById(req.userId).lean();

    const student = await Student.findById(studentId)
      .populate('class', 'className')
      .populate('section', 'sectionName')
      .populate('branch', 'branchName address contact email logo')
      .lean();

    if (!student || student.branch._id.toString() !== admin.branch.toString()) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Generate QR Code with student info
    const qrData = JSON.stringify({
      id: student._id,
      name: student.name,
      admissionNo: student.admissionNumber,
      class: student.class?.className,
      branch: student.branch.branchName
    });

    const qrCode = await QRCode.toDataURL(qrData);

    const idCardData = {
      student: {
        name: student.name,
        admissionNumber: student.admissionNumber,
        rollNumber: student.rollNumber,
        class: student.class?.className,
        section: student.section?.sectionName,
        dob: student.dob,
        bloodGroup: student.bloodGroup,
        mobile: student.mobile,
        address: student.address,
        profileImage: student.profileImage,
        fatherName: student.fatherName,
        motherName: student.motherName
      },
      branch: {
        name: student.branch.branchName,
        address: student.branch.address,
        contact: student.branch.contact,
        email: student.branch.email,
        logo: student.branch.logo
      },
      qrCode,
      validUpto: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
    };

    res.status(200).json({ idCard: idCardData });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Generate Bulk ID Cards
exports.generateBulkIdCards = async (req, res) => {
  try {
    const { classId, section } = req.query;
    const admin = await Admin.findById(req.userId).lean();

    const query = { branch: admin.branch, status: 'active' };
    if (classId) query.class = classId;
    if (section) query.section = section;

    const students = await Student.find(query)
      .populate('class', 'className')
      .populate('section', 'sectionName')
      .populate('branch', 'branchName address contact email logo')
      .sort({ rollNumber: 1 })
      .lean();

    const idCards = await Promise.all(students.map(async (student) => {
      const qrData = JSON.stringify({
        id: student._id,
        name: student.name,
        admissionNo: student.admissionNumber,
        class: student.class?.className,
        branch: student.branch.branchName
      });

      const qrCode = await QRCode.toDataURL(qrData);

      return {
        student: {
          name: student.name,
          admissionNumber: student.admissionNumber,
          rollNumber: student.rollNumber,
          class: student.class?.className,
          section: student.section?.sectionName,
          dob: student.dob,
          bloodGroup: student.bloodGroup,
          profileImage: student.profileImage
        },
        qrCode
      };
    }));

    res.status(200).json({ idCards, total: idCards.length });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Students for ID Card Generation
exports.getStudentsForIdCard = async (req, res) => {
  try {
    const { page = 1, limit = 50, classId, section, search = '' } = req.query;
    const admin = await Admin.findById(req.userId).lean();
    const skip = (page - 1) * limit;

    const query = { branch: admin.branch, status: 'active' };
    if (classId) query.class = classId;
    if (section) query.section = section;

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { admissionNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const [students, total] = await Promise.all([
      Student.find(query)
        .select('name admissionNumber rollNumber class section profileImage')
        .populate('class', 'className')
        .populate('section', 'sectionName')
        .sort({ rollNumber: 1 })
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
