const Hostel = require('../../model/Hostel');
const Room = require('../../model/Room');
const RoomType = require('../../model/RoomType');
const HostelAllocation = require('../../model/HostelAllocation');
const Warden = require('../../model/Warden');
const Admin = require('../../model/Admin');

const getBranchClient = async (userId) => {
  const admin = await Admin.findById(userId).select('branch client').lean();
  return admin || null;
};

// ─── HOSTEL ───────────────────────────────────────────────

exports.getAllHostels = async (req, res) => {
  try {
    const { branch, client } = await getBranchClient(req.userId);
    const hostels = await Hostel.find({ branch, status: true })
      .select('hostelName hostelCode type totalFloor contactNo status')
      .sort({ hostelName: 1 }).lean();
    res.status(200).json({ hostels });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createHostel = async (req, res) => {
  try {
    const { branch, client } = await getBranchClient(req.userId);
    const { hostelName, hostelCode, type, totalFloor, contactNo } = req.body;
    const hostel = await Hostel.create({ hostelName, hostelCode: hostelCode.toUpperCase(), type, totalFloor, contactNo, branch, client, createdBy: req.userId });
    res.status(201).json({ message: 'Hostel created successfully', hostel });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateHostel = async (req, res) => {
  try {
    const { branch } = await getBranchClient(req.userId);
    const hostel = await Hostel.findOneAndUpdate({ _id: req.params.id, branch }, req.body, { new: true }).lean();
    if (!hostel) return res.status(404).json({ message: 'Hostel not found' });
    res.status(200).json({ message: 'Hostel updated successfully', hostel });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteHostel = async (req, res) => {
  try {
    const { branch } = await getBranchClient(req.userId);
    await Hostel.findOneAndUpdate({ _id: req.params.id, branch }, { status: false });
    res.status(200).json({ message: 'Hostel deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── ROOM TYPE ────────────────────────────────────────────

exports.getAllRoomTypes = async (req, res) => {
  try {
    const { branch } = await getBranchClient(req.userId);
    const roomTypes = await RoomType.find({ branch, status: true }).sort({ roomTypeName: 1 }).lean();
    res.status(200).json({ roomTypes });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createRoomType = async (req, res) => {
  try {
    const { branch, client } = await getBranchClient(req.userId);
    const { roomTypeName, capacity, monthlyRent, securityDeposit, electricityCharges, effectiveFrom } = req.body;
    const roomType = await RoomType.create({ roomTypeName, capacity, monthlyRent, securityDeposit, electricityCharges, effectiveFrom, branch, client, createdBy: req.userId });
    res.status(201).json({ message: 'Room type created successfully', roomType });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateRoomType = async (req, res) => {
  try {
    const { branch } = await getBranchClient(req.userId);
    const roomType = await RoomType.findOneAndUpdate({ _id: req.params.id, branch }, req.body, { new: true }).lean();
    if (!roomType) return res.status(404).json({ message: 'Room type not found' });
    res.status(200).json({ message: 'Room type updated successfully', roomType });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteRoomType = async (req, res) => {
  try {
    const { branch } = await getBranchClient(req.userId);
    await RoomType.findOneAndUpdate({ _id: req.params.id, branch }, { status: false });
    res.status(200).json({ message: 'Room type deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── ROOM ─────────────────────────────────────────────────

exports.getAllRooms = async (req, res) => {
  try {
    const { branch } = await getBranchClient(req.userId);
    const { hostelId, status } = req.query;
    const query = { branch };
    if (hostelId) query.hostel = hostelId;
    if (status) query.status = status;
    const rooms = await Room.find(query)
      .populate('hostel', 'hostelName')
      .populate('roomType', 'roomTypeName capacity')
      .sort({ roomNo: 1 }).lean();
    res.status(200).json({ rooms });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createRoom = async (req, res) => {
  try {
    const { branch, client } = await getBranchClient(req.userId);
    const { hostel, floorNo, roomNo, roomType, capacity, monthlyRent } = req.body;
    const room = await Room.create({ hostel, floorNo, roomNo, roomType, capacity, monthlyRent, branch, client, createdBy: req.userId });
    res.status(201).json({ message: 'Room created successfully', room });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateRoom = async (req, res) => {
  try {
    const { branch } = await getBranchClient(req.userId);
    const room = await Room.findOneAndUpdate({ _id: req.params.id, branch }, req.body, { new: true }).lean();
    if (!room) return res.status(404).json({ message: 'Room not found' });
    res.status(200).json({ message: 'Room updated successfully', room });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteRoom = async (req, res) => {
  try {
    const { branch } = await getBranchClient(req.userId);
    await Room.findOneAndDelete({ _id: req.params.id, branch });
    res.status(200).json({ message: 'Room deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── HOSTEL ALLOCATION ────────────────────────────────────

exports.getAllAllocations = async (req, res) => {
  try {
    const { branch } = await getBranchClient(req.userId);
    const { hostelId, status } = req.query;
    const query = { branch };
    if (hostelId) query.hostel = hostelId;
    if (status) query.allocationStatus = status;
    const allocations = await HostelAllocation.find(query)
      .populate('hostel', 'hostelName')
      .sort({ createdAt: -1 }).lean();
    res.status(200).json({ allocations });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createAllocation = async (req, res) => {
  try {
    const { branch, client } = await getBranchClient(req.userId);
    const { studentId, studentName, hostel, roomNo, joiningDate, monthlyRent, securityDeposit, remark } = req.body;
    const allocation = await HostelAllocation.create({ studentId, studentName, hostel, roomNo, joiningDate, monthlyRent, securityDeposit, remark, branch, client, createdBy: req.userId });
    res.status(201).json({ message: 'Allocation created successfully', allocation });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateAllocation = async (req, res) => {
  try {
    const { branch } = await getBranchClient(req.userId);
    const allocation = await HostelAllocation.findOneAndUpdate({ _id: req.params.id, branch }, req.body, { new: true }).lean();
    if (!allocation) return res.status(404).json({ message: 'Allocation not found' });
    res.status(200).json({ message: 'Allocation updated successfully', allocation });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteAllocation = async (req, res) => {
  try {
    const { branch } = await getBranchClient(req.userId);
    await HostelAllocation.findOneAndUpdate({ _id: req.params.id, branch }, { allocationStatus: 'cancelled' });
    res.status(200).json({ message: 'Allocation cancelled successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── WARDEN ───────────────────────────────────────────────

exports.getAllWardens = async (req, res) => {
  try {
    const { branch } = await getBranchClient(req.userId);
    const wardens = await Warden.find({ branch })
      .populate('assignedHostel', 'hostelName')
      .select('-password')
      .sort({ wardenName: 1 }).lean();
    res.status(200).json({ wardens });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
