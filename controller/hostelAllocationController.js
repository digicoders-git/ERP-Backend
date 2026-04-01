const HostelAllocation = require('../model/HostelAllocation');
const Hostel = require('../model/Hostel');
const Admin = require('../model/Admin');

// Allocate Hostel
exports.allocateHostel = async (req, res) => {
  try {
    const { studentId, studentName, hostelId, roomNo, joiningDate, monthlyRent, securityDeposit, remark } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || (admin.role !== 'branchAdmin' && admin.role !== 'staffAdmin')) {
      return res.status(403).json({ message: 'Only branch admin or staff can allocate hostels' });
    }

    const hostel = await Hostel.findById(hostelId);
    if (!hostel) {
      return res.status(404).json({ message: 'Hostel not found' });
    }

    if (hostel.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Hostel does not belong to your branch' });
    }

    const newAllocation = new HostelAllocation({
      studentId,
      studentName,
      hostel: hostelId,
      roomNo,
      joiningDate,
      monthlyRent,
      securityDeposit,
      remark,
      branch: admin.branch,
      client: admin.client,
      createdBy: adminId
    });

    await newAllocation.save();
    res.status(201).json({ message: 'Hostel allocated successfully', allocation: newAllocation });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Allocations
exports.getAllAllocations = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const skip = (page - 1) * limit;
    const adminId = req.userId;
    const admin = await Admin.findById(adminId);

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const searchQuery = search ? {
      $or: [
        { studentName: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } },
        { roomNo: { $regex: search, $options: 'i' } }
      ]
    } : {};

    let allocations, total;
    if (admin.role === 'branchAdmin' || admin.role === 'staffAdmin') {
      searchQuery.branch = admin.branch;
      allocations = await HostelAllocation.find(searchQuery)
        .populate('hostel', 'hostelName hostelCode')
        .populate('branch', 'branchName branchCode')
        .populate('createdBy', 'email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      total = await HostelAllocation.countDocuments(searchQuery);
    } else if (admin.role === 'clientAdmin') {
      searchQuery.client = admin.client;
      allocations = await HostelAllocation.find(searchQuery)
        .populate('hostel', 'hostelName hostelCode')
        .populate('branch', 'branchName branchCode')
        .populate('createdBy', 'email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      total = await HostelAllocation.countDocuments(searchQuery);
    } else {
      allocations = await HostelAllocation.find(searchQuery)
        .populate('hostel', 'hostelName hostelCode')
        .populate('branch', 'branchName branchCode')
        .populate('client', 'name')
        .populate('createdBy', 'email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      total = await HostelAllocation.countDocuments(searchQuery);
    }

    res.status(200).json({ 
      allocations, 
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

// Get Allocation By ID
exports.getAllocationById = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const allocation = await HostelAllocation.findById(id)
      .populate('hostel', 'hostelName hostelCode type')
      .populate('branch', 'branchName branchCode')
      .populate('client', 'name')
      .populate('createdBy', 'email role');

    if (!allocation) {
      return res.status(404).json({ message: 'Allocation not found' });
    }

    if (admin.role === 'branchAdmin' && allocation.branch._id.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (admin.role === 'clientAdmin' && allocation.client._id.toString() !== admin.client.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.status(200).json({ allocation });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Allocation
exports.updateAllocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentId, studentName, hostelId, roomNo, joiningDate, monthlyRent, securityDeposit, remark } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || (admin.role !== 'branchAdmin' && admin.role !== 'staffAdmin')) {
      return res.status(403).json({ message: 'Only branch admin or staff can update allocations' });
    }

    const allocation = await HostelAllocation.findById(id);
    if (!allocation) {
      return res.status(404).json({ message: 'Allocation not found' });
    }

    if (allocation.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (allocation.allocationStatus === 'cancelled') {
      return res.status(400).json({ message: 'Cannot update cancelled allocation' });
    }

    if (hostelId && hostelId !== allocation.hostel.toString()) {
      const hostel = await Hostel.findById(hostelId);
      if (!hostel) {
        return res.status(404).json({ message: 'Hostel not found' });
      }
      if (hostel.branch.toString() !== admin.branch.toString()) {
        return res.status(403).json({ message: 'Hostel does not belong to your branch' });
      }
      allocation.hostel = hostelId;
    }

    if (studentId) allocation.studentId = studentId;
    if (studentName) allocation.studentName = studentName;
    if (roomNo) allocation.roomNo = roomNo;
    if (joiningDate) allocation.joiningDate = joiningDate;
    if (monthlyRent !== undefined) allocation.monthlyRent = monthlyRent;
    if (securityDeposit !== undefined) allocation.securityDeposit = securityDeposit;
    if (remark !== undefined) allocation.remark = remark;

    await allocation.save();
    res.status(200).json({ message: 'Allocation updated successfully', allocation });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Cancel Allocation
exports.cancelAllocation = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || (admin.role !== 'branchAdmin' && admin.role !== 'staffAdmin')) {
      return res.status(403).json({ message: 'Only branch admin or staff can cancel allocations' });
    }

    const allocation = await HostelAllocation.findById(id);
    if (!allocation) {
      return res.status(404).json({ message: 'Allocation not found' });
    }

    if (allocation.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (allocation.allocationStatus === 'cancelled') {
      return res.status(400).json({ message: 'Allocation is already cancelled' });
    }

    allocation.allocationStatus = 'cancelled';
    await allocation.save();

    res.status(200).json({ message: 'Allocation cancelled successfully', allocation });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
