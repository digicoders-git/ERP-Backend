const LibraryStudent = require('../../model/LibraryStudent');
const Admin = require('../../model/Admin');

// Add Student
exports.addStudent = async (req, res) => {
  try {
    const { name, phone, email, class: className, year, rollNo, status } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || admin.role !== 'libraryAdmin') {
      return res.status(403).json({ message: 'Only library admin can add students' });
    }

    const student = new LibraryStudent({
      name,
      phone,
      email,
      class: className,
      year,
      rollNo,
      status: status !== undefined ? status : true,
      branch: admin.branch,
      client: admin.client,
      createdBy: adminId
    });

    await student.save();
    res.status(201).json({ message: 'Student added successfully', student });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Students
exports.getAllStudents = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const skip = (page - 1) * limit;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || admin.role !== 'libraryAdmin') {
      return res.status(403).json({ message: 'Only library admin can view students' });
    }

    const searchQuery = { branch: admin.branch };
    if (search) {
      searchQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { rollNo: { $regex: search, $options: 'i' } },
        { class: { $regex: search, $options: 'i' } }
      ];
    }

    const students = await LibraryStudent.find(searchQuery)
      .populate('createdBy', 'email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await LibraryStudent.countDocuments(searchQuery);

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

// Update Student
exports.updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, class: className, year, rollNo, status } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || admin.role !== 'libraryAdmin') {
      return res.status(403).json({ message: 'Only library admin can update students' });
    }

    const student = await LibraryStudent.findById(id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (student.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (name) student.name = name;
    if (phone) student.phone = phone;
    if (email) student.email = email;
    if (className) student.class = className;
    if (year) student.year = year;
    if (rollNo) student.rollNo = rollNo;
    if (status !== undefined) student.status = status;

    await student.save();
    res.status(200).json({ message: 'Student updated successfully', student });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
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

    const student = await LibraryStudent.findById(id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (student.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await LibraryStudent.findByIdAndDelete(id);
    res.status(200).json({ message: 'Student deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
