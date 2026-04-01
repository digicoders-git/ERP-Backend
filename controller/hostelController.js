const Hostel = require('../model/Hostel');
const Admin = require('../model/Admin');
const Room = require('../model/Room');
const Warden = require('../model/Warden');
const HostelAllocation = require('../model/HostelAllocation');

// Create Hostel
exports.createHostel = async (req, res) => {
  try {
    const { hostelName, hostelCode, type, totalFloor, contactNo } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || (admin.role !== 'branchAdmin' && admin.role !== 'staffAdmin')) {
      return res.status(403).json({ message: 'Only branch admin or staff can create hostels' });
    }

    const existingHostel = await Hostel.findOne({ hostelCode: hostelCode.toUpperCase() });
    if (existingHostel) {
      return res.status(400).json({ message: 'Hostel code already exists' });
    }

    const newHostel = new Hostel({
      hostelName,
      hostelCode: hostelCode.toUpperCase(),
      type,
      totalFloor,
      contactNo,
      branch: admin.branch,
      client: admin.client,
      createdBy: adminId
    });

    await newHostel.save();
    res.status(201).json({ message: 'Hostel created successfully', hostel: newHostel });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Hostels
exports.getAllHostels = async (req, res) => {
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
        { hostelName: { $regex: search, $options: 'i' } },
        { hostelCode: { $regex: search, $options: 'i' } },
        { contactNo: { $regex: search, $options: 'i' } }
      ]
    } : {};

    let hostels, total;
    if (admin.role === 'branchAdmin' || admin.role === 'staffAdmin') {
      searchQuery.branch = admin.branch;
      hostels = await Hostel.find(searchQuery)
        .populate('branch', 'branchName branchCode')
        .populate('createdBy', 'email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      total = await Hostel.countDocuments(searchQuery);
    } else if (admin.role === 'clientAdmin') {
      searchQuery.client = admin.client;
      hostels = await Hostel.find(searchQuery)
        .populate('branch', 'branchName branchCode')
        .populate('createdBy', 'email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      total = await Hostel.countDocuments(searchQuery);
    } else {
      hostels = await Hostel.find(searchQuery)
        .populate('branch', 'branchName branchCode')
        .populate('client', 'name')
        .populate('createdBy', 'email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      total = await Hostel.countDocuments(searchQuery);
    }

    res.status(200).json({ 
      hostels, 
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

// Get Hostel By ID
exports.getHostelById = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const hostel = await Hostel.findById(id)
      .populate('branch', 'branchName branchCode')
      .populate('client', 'name')
      .populate('createdBy', 'email role');

    if (!hostel) {
      return res.status(404).json({ message: 'Hostel not found' });
    }

    if (admin.role === 'branchAdmin' && hostel.branch._id.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (admin.role === 'clientAdmin' && hostel.client._id.toString() !== admin.client.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.status(200).json({ hostel });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Hostel
exports.updateHostel = async (req, res) => {
  try {
    const { id } = req.params;
    const { hostelName, hostelCode, type, totalFloor, contactNo } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || (admin.role !== 'branchAdmin' && admin.role !== 'staffAdmin')) {
      return res.status(403).json({ message: 'Only branch admin or staff can update hostels' });
    }

    const hostel = await Hostel.findById(id);
    if (!hostel) {
      return res.status(404).json({ message: 'Hostel not found' });
    }

    if (hostel.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (hostelCode && hostelCode.toUpperCase() !== hostel.hostelCode) {
      const existingHostel = await Hostel.findOne({ hostelCode: hostelCode.toUpperCase() });
      if (existingHostel) {
        return res.status(400).json({ message: 'Hostel code already exists' });
      }
    }

    if (hostelName) hostel.hostelName = hostelName;
    if (hostelCode) hostel.hostelCode = hostelCode.toUpperCase();
    if (type) hostel.type = type;
    if (totalFloor) hostel.totalFloor = totalFloor;
    if (contactNo) hostel.contactNo = contactNo;

    await hostel.save();
    res.status(200).json({ message: 'Hostel updated successfully', hostel });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete Hostel
exports.deleteHostel = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || (admin.role !== 'branchAdmin' && admin.role !== 'staffAdmin')) {
      return res.status(403).json({ message: 'Only branch admin or staff can delete hostels' });
    }

    const hostel = await Hostel.findById(id);
    if (!hostel) {
      return res.status(404).json({ message: 'Hostel not found' });
    }

    if (hostel.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Hostel.findByIdAndDelete(id);
    res.status(200).json({ message: 'Hostel deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Hostel Dashboard Stats
exports.getHostelDashboardStats = async (req, res) => {
  try {
    const admin = await Admin.findById(req.userId);
    if (!admin || (admin.role !== 'branchAdmin' && admin.role !== 'staffAdmin')) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const branchId = admin.branch;

    const [totalHostels, activeHostels, totalRooms, availableRooms, occupiedRooms, totalWardens, totalAllocations, activeAllocations] = await Promise.all([
      Hostel.countDocuments({ branch: branchId }),
      Hostel.countDocuments({ branch: branchId, status: true }),
      Room.countDocuments({ branch: branchId }),
      Room.countDocuments({ branch: branchId, status: 'available' }),
      Room.countDocuments({ branch: branchId, status: 'occupied' }),
      Warden.countDocuments({ branch: branchId }),
      HostelAllocation.countDocuments({ branch: branchId }),
      HostelAllocation.countDocuments({ branch: branchId, allocationStatus: 'active' })
    ]);

    const recentAllocations = await HostelAllocation.find({ branch: branchId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('hostel', 'hostelName hostelCode')
      .select('studentName roomNo joiningDate allocationStatus createdAt');

    res.status(200).json({
      stats: {
        totalHostels,
        activeHostels,
        totalRooms,
        availableRooms,
        occupiedRooms,
        totalWardens,
        totalAllocations,
        activeAllocations
      },
      recentAllocations
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Toggle Hostel Status
exports.toggleHostelStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || (admin.role !== 'branchAdmin' && admin.role !== 'staffAdmin')) {
      return res.status(403).json({ message: 'Only branch admin or staff can toggle hostel status' });
    }

    const hostel = await Hostel.findById(id);
    if (!hostel) {
      return res.status(404).json({ message: 'Hostel not found' });
    }

    if (hostel.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    hostel.status = !hostel.status;
    await hostel.save();

    res.status(200).json({ message: `Hostel status changed to ${hostel.status}`, hostel });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
