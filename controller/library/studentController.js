const Student = require('../../model/Student');
const Class = require('../../model/Class');
const Admin = require('../../model/Admin');

// Add Student (Mainly for library members, but we'll use the Student model)
exports.addStudent = async (req, res) => {
  try {
    const { name, firstName, lastName, phone, email, class: classId, year, rollNo, status } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || admin.role !== 'libraryAdmin') {
      return res.status(403).json({ message: 'Only library admin can add students' });
    }

    // Creating a new student in the main Student model
    const student = new Student({
      firstName: firstName || name.split(' ')[0],
      lastName: lastName || name.split(' ').slice(1).join(' ') || 'Student',
      phone,
      email,
      class: classId,
      rollNumber: rollNo,
      status: status === 'Active' ? 'active' : 'inactive',
      branch: admin.branch,
      client: admin.client,
      createdBy: adminId,
      // Default required fields for Student model
      gender: req.body.gender || 'other',
      dob: req.body.dob || new Date(),
      category: req.body.category || 'general',
      permanentAddress: req.body.permanentAddress || { address: 'N/A', city: 'N/A', state: 'N/A', pincode: 'N/A' },
      currentAddress: req.body.currentAddress || { address: 'N/A', city: 'N/A', state: 'N/A', pincode: 'N/A' },
      hasPreviousEducation: 'no',
      guardianInfo: { fatherName: 'N/A', motherName: 'N/A', guardianPhone: phone, emergencyPhone: phone }
    });

    await student.save();
    res.status(201).json({ success: true, message: 'Student added successfully', data: student });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get All Students from the main Student model
exports.getAllStudents = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', classId } = req.query;
    const skip = (page - 1) * limit;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || admin.role !== 'libraryAdmin') {
      return res.status(403).json({ message: 'Only library admin can view students' });
    }

    const searchQuery = { branch: admin.branch };
    
    if (classId) {
      searchQuery.class = classId;
    }

    if (search) {
      searchQuery.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { admissionNumber: { $regex: search, $options: 'i' } },
        { rollNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const students = await Student.find(searchQuery)
      .populate('class', 'className')
      .populate('section', 'sectionName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Student.countDocuments(searchQuery);

    res.status(200).json({
      success: true,
      data: students,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get Classes for the branch
exports.getClasses = async (req, res) => {
  try {
    const adminId = req.userId;
    const admin = await Admin.findById(adminId);
    
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const classes = await Class.find({ branch: admin.branch }).sort({ className: 1 });
    
    res.status(200).json({
      success: true,
      data: classes
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get Sections for a class or branch
exports.getSections = async (req, res) => {
  try {
    const adminId = req.userId;
    const { classId } = req.query;
    const admin = await Admin.findById(adminId);
    
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const query = { branch: admin.branch };
    if (classId) {
      query.assignToClass = classId;
    }

    const sections = await Section.find(query).sort({ sectionName: 1 });
    
    res.status(200).json({
      success: true,
      data: sections
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Update Student
exports.updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, firstName, lastName, phone, email, class: classId, section, year, rollNo, status } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || admin.role !== 'libraryAdmin') {
      return res.status(403).json({ message: 'Only library admin can update students' });
    }

    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (student.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (name) {
      student.firstName = name.split(' ')[0];
      student.lastName = name.split(' ').slice(1).join(' ') || student.lastName;
    }
    if (firstName) student.firstName = firstName;
    if (lastName) student.lastName = lastName;
    if (phone) student.phone = phone;
    if (email) student.email = email;
    if (classId) student.class = classId;
    if (section) student.section = section;
    if (rollNo) student.rollNumber = rollNo;
    if (status !== undefined) student.status = status === 'Active' ? 'active' : 'inactive';

    await student.save();
    res.status(200).json({ success: true, message: 'Student updated successfully', data: student });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};


// Delete Student
exports.deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || admin.role !== 'libraryAdmin') {
      return res.status(403).json({ message: 'Only library admin can delete students' });
    }

    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (student.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Student.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'Student deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

