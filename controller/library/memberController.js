const LibraryMember = require('../../model/LibraryMember');
const Student = require('../../model/Student');
const Admin = require('../../model/Admin');

const getAdmin = async (adminId) => {
  const admin = await Admin.findById(adminId).lean();
  if (!admin || admin.role !== 'libraryAdmin') return null;
  return admin;
};

// Add Member
exports.addMember = async (req, res) => {
  try {
    const { name, email, phone, memberId, joiningDate, status, memberType, address, branch, school } = req.body;
    const admin = await getAdmin(req.userId);
    if (!admin) return res.status(403).json({ success: false, message: 'Only library admin can add members' });

    const member = new LibraryMember({
      name, email, phone, memberId,
      joiningDate: joiningDate || new Date(),
      status: status === 'Active' || status === true,
      memberType: memberType || 'General',
      address: address || '',
      branch: branch || admin.branch,
      client: school || admin.client,
      createdBy: req.userId
    });

    await member.save();
    res.status(201).json({ success: true, message: 'Member added successfully', data: member });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get All Members
exports.getAllMembers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const skip = (page - 1) * limit;
    const admin = await getAdmin(req.userId);
    if (!admin) return res.status(403).json({ success: false, message: 'Only library admin can view members' });

    const searchQuery = { branch: admin.branch };
    const studentSearchQuery = { branch: admin.branch };
    
    if (search) {
      searchQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { memberId: { $regex: search, $options: 'i' } }
      ];
      studentSearchQuery.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { admissionNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const [members, students, totalMembers, totalStudents] = await Promise.all([
      LibraryMember.find(searchQuery).select('-createdBy').lean(),
      Student.find(studentSearchQuery).select('firstName lastName email admissionNumber rollNumber status').lean(),
      LibraryMember.countDocuments(searchQuery),
      Student.countDocuments(studentSearchQuery)
    ]);

    const formattedMembers = members.map(member => ({
      _id: member._id,
      name: member.name,
      email: member.email,
      id: member.memberId || `MEM${member._id.toString().slice(-6).toUpperCase()}`,
      status: member.status ? 'Active' : 'Inactive',
      memberType: 'LibraryMember',
      address: member.address || ''
    }));

    const formattedStudents = students.map(student => ({
      _id: student._id,
      name: `${student.firstName} ${student.lastName}`.trim(),
      email: student.email,
      id: student.admissionNumber || student.rollNumber || 'STU-N/A',
      status: (student.status === 'active' || student.status === 'Active') ? 'Active' : 'Inactive',
      memberType: 'Student',
      address: student.address || ''
    }));

    const allMembers = [...formattedMembers, ...formattedStudents];
    const total = totalMembers + totalStudents;

    // Manual pagination for combined results
    const paginatedMembers = allMembers.slice(skip, skip + parseInt(limit));

    res.status(200).json({
      success: true,
      data: paginatedMembers,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get Member By ID
exports.getMemberById = async (req, res) => {
  try {
    const admin = await getAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Only library admin can view members' });

    const member = await LibraryMember.findById(req.params.id).lean();
    if (!member) return res.status(404).json({ message: 'Member not found' });
    if (member.branch.toString() !== admin.branch.toString()) return res.status(403).json({ message: 'Access denied' });

    res.status(200).json({ member });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Member
exports.updateMember = async (req, res) => {
  try {
    const { name, email, phone, memberId, joiningDate, status, memberType, address } = req.body;
    const admin = await getAdmin(req.userId);
    if (!admin) return res.status(403).json({ success: false, message: 'Only library admin can update members' });

    const member = await LibraryMember.findById(req.params.id);
    if (!member) return res.status(404).json({ success: false, message: 'Member not found' });
    if (member.branch.toString() !== admin.branch.toString()) return res.status(403).json({ success: false, message: 'Access denied' });

    if (name) member.name = name;
    if (email) member.email = email;
    if (phone !== undefined) member.phone = phone;
    if (memberId !== undefined) member.memberId = memberId;
    if (joiningDate) member.joiningDate = joiningDate;
    if (status !== undefined) member.status = status === 'Active' || status === true;
    if (memberType) member.memberType = memberType;
    if (address !== undefined) member.address = address;

    await member.save();
    res.status(200).json({ success: true, message: 'Member updated successfully', data: member });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Delete Member
exports.deleteMember = async (req, res) => {
  try {
    const admin = await getAdmin(req.userId);
    if (!admin) return res.status(403).json({ success: false, message: 'Only library admin can delete members' });

    const member = await LibraryMember.findById(req.params.id);
    if (!member) return res.status(404).json({ success: false, message: 'Member not found' });
    if (member.branch.toString() !== admin.branch.toString()) return res.status(403).json({ success: false, message: 'Access denied' });

    await LibraryMember.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Member deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
