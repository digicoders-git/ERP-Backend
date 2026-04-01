const RoomType = require('../model/RoomType');
const Admin = require('../model/Admin');

// Create Room Type
exports.createRoomType = async (req, res) => {
  try {
    const { roomTypeName, capacity, monthlyRent, securityDeposit, electricityCharges, effectiveFrom } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || admin.role !== 'branchAdmin') {
      return res.status(403).json({ message: 'Only branch admin can create room types' });
    }

    const newRoomType = new RoomType({
      roomTypeName,
      capacity,
      monthlyRent,
      securityDeposit,
      electricityCharges,
      effectiveFrom,
      branch: admin.branch,
      client: admin.client,
      createdBy: adminId
    });

    await newRoomType.save();
    res.status(201).json({ message: 'Room type created successfully', roomType: newRoomType });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Room Types
exports.getAllRoomTypes = async (req, res) => {
  try {
    const adminId = req.userId;
    const admin = await Admin.findById(adminId);

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    let roomTypes;
    if (admin.role === 'branchAdmin') {
      roomTypes = await RoomType.find({ branch: admin.branch })
        .populate('branch', 'branchName branchCode')
        .populate('createdBy', 'email role');
    } else if (admin.role === 'clientAdmin') {
      roomTypes = await RoomType.find({ client: admin.client })
        .populate('branch', 'branchName branchCode')
        .populate('createdBy', 'email role');
    } else {
      roomTypes = await RoomType.find()
        .populate('branch', 'branchName branchCode')
        .populate('client', 'name')
        .populate('createdBy', 'email role');
    }

    res.status(200).json({ roomTypes });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Room Type By ID
exports.getRoomTypeById = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const roomType = await RoomType.findById(id)
      .populate('branch', 'branchName branchCode')
      .populate('client', 'name')
      .populate('createdBy', 'email role');

    if (!roomType) {
      return res.status(404).json({ message: 'Room type not found' });
    }

    if (admin.role === 'branchAdmin' && roomType.branch._id.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (admin.role === 'clientAdmin' && roomType.client._id.toString() !== admin.client.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.status(200).json({ roomType });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Room Type
exports.updateRoomType = async (req, res) => {
  try {
    const { id } = req.params;
    const { roomTypeName, capacity, monthlyRent, securityDeposit, electricityCharges, effectiveFrom } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || admin.role !== 'branchAdmin') {
      return res.status(403).json({ message: 'Only branch admin can update room types' });
    }

    const roomType = await RoomType.findById(id);
    if (!roomType) {
      return res.status(404).json({ message: 'Room type not found' });
    }

    if (roomType.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (roomTypeName) roomType.roomTypeName = roomTypeName;
    if (capacity) roomType.capacity = capacity;
    if (monthlyRent !== undefined) roomType.monthlyRent = monthlyRent;
    if (securityDeposit !== undefined) roomType.securityDeposit = securityDeposit;
    if (electricityCharges !== undefined) roomType.electricityCharges = electricityCharges;
    if (effectiveFrom) roomType.effectiveFrom = effectiveFrom;

    await roomType.save();
    res.status(200).json({ message: 'Room type updated successfully', roomType });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete Room Type
exports.deleteRoomType = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || admin.role !== 'branchAdmin') {
      return res.status(403).json({ message: 'Only branch admin can delete room types' });
    }

    const roomType = await RoomType.findById(id);
    if (!roomType) {
      return res.status(404).json({ message: 'Room type not found' });
    }

    if (roomType.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await RoomType.findByIdAndDelete(id);
    res.status(200).json({ message: 'Room type deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Toggle Room Type Status
exports.toggleRoomTypeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || admin.role !== 'branchAdmin') {
      return res.status(403).json({ message: 'Only branch admin can toggle room type status' });
    }

    const roomType = await RoomType.findById(id);
    if (!roomType) {
      return res.status(404).json({ message: 'Room type not found' });
    }

    if (roomType.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    roomType.status = !roomType.status;
    await roomType.save();

    res.status(200).json({ message: `Room type status changed to ${roomType.status}`, roomType });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
