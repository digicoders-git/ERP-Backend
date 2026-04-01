const LibraryMember = require('../../model/LibraryMember');
const Admin = require('../../model/Admin');

const getAdmin = async (adminId) => {
  const admin = await Admin.findById(adminId).lean();
  if (!admin || admin.role !== 'libraryAdmin') return null;
  return admin;
};

// Add Member
exports.addMember = async (req, res) => {
  try {
    const { name, email, phone, memberId, joiningDate, status } = req.body;
    const admin = await getAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Only library admin can add members' });

    const member = new LibraryMember({
      name, email, phone, memberId,
      joiningDate,
      status: status !== undefined ? status : true,
      branch: admin.branch,
      client: admin.client,
      createdBy: req.userId
    });

    await member.save();
    res.status(201).json({ message: 'Member added successfully', member });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Members
exports.getAllMembers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const skip = (page - 1) * limit;
    const admin = await getAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Only library admin can view members' });

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
        .select('-createdBy')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      LibraryMember.countDocuments(searchQuery)
    ]);

    res.status(200).json({
      members,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
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
    const { name, email, phone, memberId, joiningDate, status } = req.body;
    const admin = await getAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Only library admin can update members' });

    const member = await LibraryMember.findById(req.params.id);
    if (!member) return res.status(404).json({ message: 'Member not found' });
    if (member.branch.toString() !== admin.branch.toString()) return res.status(403).json({ message: 'Access denied' });

    if (name) member.name = name;
    if (email) member.email = email;
    if (phone !== undefined) member.phone = phone;
    if (memberId !== undefined) member.memberId = memberId;
    if (joiningDate) member.joiningDate = joiningDate;
    if (status !== undefined) member.status = status;

    await member.save();
    res.status(200).json({ message: 'Member updated successfully', member });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete Member
exports.deleteMember = async (req, res) => {
  try {
    const admin = await getAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Only library admin can delete members' });

    const member = await LibraryMember.findById(req.params.id);
    if (!member) return res.status(404).json({ message: 'Member not found' });
    if (member.branch.toString() !== admin.branch.toString()) return res.status(403).json({ message: 'Access denied' });

    await LibraryMember.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Member deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
