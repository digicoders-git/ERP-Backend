const Hostel = require('../../model/Hostel');
const Room = require('../../model/Room');
const RoomType = require('../../model/RoomType');
const HostelAllocation = require('../../model/HostelAllocation');
const Warden = require('../../model/Warden');
const Admin = require('../../model/Admin');
const Staff = require('../../model/Staff');
const Student = require('../../model/Student');

const getBranchClient = async (userId) => {
  let user = await Admin.findById(userId).select('branch client').lean();
  if (!user) {
    user = await Staff.findById(userId).select('branch client').lean();
  }
  if (!user) {
    throw new Error('User not found or unauthorized');
  }
  return user;
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

    // Check if room number already exists on this floor in the selected hostel
    const existingRoom = await Room.findOne({ hostel, floorNo, roomNo: roomNo.trim(), branch });
    if (existingRoom) {
      return res.status(400).json({ message: `Room number ${roomNo} already exists on Floor ${floorNo} in this hostel.` });
    }

    const room = await Room.create({ hostel, floorNo, roomNo: roomNo.trim(), roomType, capacity, monthlyRent, branch, client, createdBy: req.userId });
    res.status(201).json({ message: 'Room created successfully', room });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateRoom = async (req, res) => {
  try {
    const { branch } = await getBranchClient(req.userId);
    const { hostel, floorNo, roomNo } = req.body;

    if (roomNo !== undefined || floorNo !== undefined || hostel !== undefined) {
      // Find the current room to know its existing details
      const currentRoom = await Room.findOne({ _id: req.params.id, branch }).lean();
      if (!currentRoom) return res.status(404).json({ message: 'Room not found' });

      const checkHostel = hostel || currentRoom.hostel;
      const checkFloor = floorNo !== undefined ? floorNo : currentRoom.floorNo;
      const checkRoomNo = roomNo !== undefined ? roomNo.trim() : currentRoom.roomNo;

      // Check if there is another room with the same number on the same floor/hostel
      const existingDuplicate = await Room.findOne({
        _id: { $ne: req.params.id },
        hostel: checkHostel,
        floorNo: checkFloor,
        roomNo: checkRoomNo,
        branch
      });

      if (existingDuplicate) {
        return res.status(400).json({ message: `Room number ${checkRoomNo} already exists on Floor ${checkFloor} in this hostel.` });
      }
    }

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
    const { studentId, hostel, roomNo, joiningDate, monthlyRent, securityDeposit, remark } = req.body;

    // Validate student existence in institutional database
    const mongoose = require('mongoose');
    const student = await Student.findOne({
      $or: [
        { admissionNumber: studentId },
        { _id: mongoose.Types.ObjectId.isValid(studentId) ? studentId : null }
      ],
      branch
    });

    if (!student) {
      return res.status(400).json({ message: 'Student not found in institutional database.' });
    }

    const correctStudentName = `${student.firstName} ${student.lastName}`;

    // Verify if student already has an active allocation
    const existingAllocation = await HostelAllocation.findOne({
      studentId: student.admissionNumber,
      allocationStatus: 'allocated'
    });
    if (existingAllocation) {
      return res.status(400).json({ message: `Student is already allocated to room ${existingAllocation.roomNo}` });
    }

    const allocation = await HostelAllocation.create({
      studentId: student.admissionNumber,
      studentName: correctStudentName,
      hostel,
      roomNo,
      joiningDate,
      monthlyRent,
      securityDeposit,
      remark,
      branch,
      client,
      createdBy: req.userId
    });
    res.status(201).json({ message: 'Allocation created successfully', allocation });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateAllocation = async (req, res) => {
  try {
    const { branch } = await getBranchClient(req.userId);
    const { studentId, hostel, roomNo, monthlyRent, securityDeposit, remark, joiningDate } = req.body;

    const allocation = await HostelAllocation.findOne({ _id: req.params.id, branch });
    if (!allocation) return res.status(404).json({ message: 'Allocation not found' });

    if (allocation.allocationStatus === 'cancelled') {
      return res.status(400).json({ message: 'Cannot update cancelled allocation' });
    }

    const updateFields = {};

    if (studentId && studentId !== allocation.studentId) {
      const mongoose = require('mongoose');
      const student = await Student.findOne({
        $or: [
          { admissionNumber: studentId },
          { _id: mongoose.Types.ObjectId.isValid(studentId) ? studentId : null }
        ],
        branch
      });

      if (!student) {
        return res.status(400).json({ message: 'Student not found in institutional database.' });
      }

      const existingAllocation = await HostelAllocation.findOne({
        studentId: student.admissionNumber,
        allocationStatus: 'allocated',
        _id: { $ne: req.params.id }
      });
      if (existingAllocation) {
        return res.status(400).json({ message: `Student is already allocated to room ${existingAllocation.roomNo}` });
      }

      updateFields.studentId = student.admissionNumber;
      updateFields.studentName = `${student.firstName} ${student.lastName}`;
    }

    if (hostel) updateFields.hostel = hostel;
    if (roomNo) updateFields.roomNo = roomNo;
    if (joiningDate) updateFields.joiningDate = joiningDate;
    if (monthlyRent !== undefined) updateFields.monthlyRent = monthlyRent;
    if (securityDeposit !== undefined) updateFields.securityDeposit = securityDeposit;
    if (remark !== undefined) updateFields.remark = remark;

    const updatedAllocation = await HostelAllocation.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true }
    ).lean();

    res.status(200).json({ message: 'Allocation updated successfully', allocation: updatedAllocation });
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

exports.createWarden = async (req, res) => {
  try {
    const { branch, client } = await getBranchClient(req.userId);
    const warden = await Warden.create({ ...req.body, branch, client, createdBy: req.userId });
    res.status(201).json({ message: 'Warden created successfully', warden });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateWarden = async (req, res) => {
  try {
    const { branch } = await getBranchClient(req.userId);
    const warden = await Warden.findOneAndUpdate({ _id: req.params.id, branch }, req.body, { new: true }).lean();
    if (!warden) return res.status(404).json({ message: 'Warden not found' });
    res.status(200).json({ message: 'Warden updated successfully', warden });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteWarden = async (req, res) => {
  try {
    const { branch } = await getBranchClient(req.userId);
    await Warden.findOneAndDelete({ _id: req.params.id, branch });
    res.status(200).json({ message: 'Warden deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
