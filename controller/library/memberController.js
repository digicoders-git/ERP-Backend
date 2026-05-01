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
    const { name, email, phone, memberId, joiningDate, status, memberType, address, branch, school, studentId, validTill } = req.body;
    const admin = await getAdmin(req.userId);
    if (!admin) return res.status(403).json({ success: false, message: 'Only library admin can add members' });

    // Check if student is already a member
    if (studentId) {
      const existingMember = await LibraryMember.findOne({ studentId, branch: admin.branch });
      if (existingMember) {
        return res.status(400).json({ success: false, message: 'This student is already a library member.' });
      }
    }

    const branchToUse = branch || admin.branch;
    const clientToUse = school || admin.client;

    if (!branchToUse || !clientToUse) {
      return res.status(400).json({ 
        success: false, 
        message: 'Admin branch or school information is missing. Please contact system administrator.' 
      });
    }

    const member = new LibraryMember({
      name, email, phone, memberId,
      joiningDate: joiningDate || new Date(),
      status: status === 'Active' || status === true,
      memberType: memberType || 'General',
      address: address || '',
      validTill: validTill || null,
      studentId: studentId || null,
      branch: branchToUse,
      client: clientToUse,
      createdBy: req.userId
    });

    await member.save();
    res.status(201).json({ success: true, message: 'Member added successfully', data: member });
  } catch (error) {
    console.error('Error in addMember:', error);
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

    if (search) {
      searchQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { memberId: { $regex: search, $options: 'i' } }
      ];
    }

    const [members, total] = await Promise.all([
      LibraryMember.find(searchQuery)
        .populate({
          path: 'studentId',
          select: 'firstName lastName email phone mobile admissionNumber rollNumber dob profileImage stream class currentAddress',
          populate: { path: 'class', select: 'className' }
        })
        .select('-createdBy')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      LibraryMember.countDocuments(searchQuery)
    ]);

    const formatDate = (dateValue) => {
      if (!dateValue) return 'N/A';
      const d = new Date(dateValue);
      if (isNaN(d.getTime())) return 'N/A';
      return d.toISOString().split('T')[0];
    };

    const formattedMembers = members.map(member => {
      const isStudent = !!member.studentId;
      const student = member.studentId;
      
      // Debug log to see what's being fetched
      if (isStudent && !student.phone) {
        console.log(`Missing phone for student ${student._id}:`, Object.keys(student));
      }

      return {
        _id: member._id,
        name: isStudent ? `${student.firstName || ''} ${student.lastName || ''}`.trim() : member.name,
        email: isStudent ? student.email : member.email,
        phone: isStudent ? (student.phone || student.mobile || 'N/A') : (member.phone || 'N/A'),
        id: isStudent ? (student.admissionNumber || student.rollNumber) : (member.memberId || `MEM${member._id.toString().slice(-6).toUpperCase()}`),
        status: member.status ? 'Active' : 'Inactive',
        memberType: member.memberType || (isStudent ? 'Student' : 'General'),
        address: isStudent ? (student.address || (student.currentAddress ? `${student.currentAddress.address || ''}, ${student.currentAddress.city || ''}` : 'N/A')) : (member.address || 'N/A'),
        class: isStudent ? (student.class?.className || 'N/A') : 'N/A',
        stream: isStudent ? (student.stream || '') : '',
        dob: isStudent ? formatDate(student.dob) : 'N/A',
        validTill: member.validTill ? formatDate(member.validTill) : 'Lifetime',
        profileImage: isStudent ? (student.profileImage || null) : null,
        joinDate: formatDate(member.joiningDate || member.createdAt)
      };
    });

    res.status(200).json({
      success: true,
      data: formattedMembers,
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
    const { name, email, phone, memberId, joiningDate, status, memberType, address, validTill } = req.body;
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
    if (validTill !== undefined) member.validTill = validTill || null;

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
