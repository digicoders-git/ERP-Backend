const Room = require('../model/Room');
const Hostel = require('../model/Hostel');
const RoomType = require('../model/RoomType');
const Admin = require('../model/Admin');

// Create Room
exports.createRoom = async (req, res) => {
  try {
    const { hostelId, floorNo, roomNo, roomTypeId, capacity, monthlyRent } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || (admin.role !== 'branchAdmin' && admin.role !== 'staffAdmin')) {
      return res.status(403).json({ message: 'Only branch admin or staff can create rooms' });
    }

    const hostel = await Hostel.findById(hostelId);
    if (!hostel) {
      return res.status(404).json({ message: 'Hostel not found' });
    }

    if (hostel.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Hostel does not belong to your branch' });
    }

    const roomType = await RoomType.findById(roomTypeId);
    if (!roomType) {
      return res.status(404).json({ message: 'Room type not found' });
    }

    if (roomType.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Room type does not belong to your branch' });
    }

    const newRoom = new Room({
      hostel: hostelId,
      floorNo,
      roomNo,
      roomType: roomTypeId,
      capacity,
      monthlyRent,
      branch: admin.branch,
      client: admin.client,
      createdBy: adminId
    });

    await newRoom.save();
    res.status(201).json({ message: 'Room created successfully', room: newRoom });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Rooms
exports.getAllRooms = async (req, res) => {
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
        { roomNo: { $regex: search, $options: 'i' } }
      ]
    } : {};

    let rooms, total;
    if (admin.role === 'branchAdmin' || admin.role === 'staffAdmin') {
      searchQuery.branch = admin.branch;
      rooms = await Room.find(searchQuery)
        .populate('hostel', 'hostelName hostelCode')
        .populate('roomType', 'roomTypeName')
        .populate('branch', 'branchName branchCode')
        .populate('createdBy', 'email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      total = await Room.countDocuments(searchQuery);
    } else if (admin.role === 'clientAdmin') {
      searchQuery.client = admin.client;
      rooms = await Room.find(searchQuery)
        .populate('hostel', 'hostelName hostelCode')
        .populate('roomType', 'roomTypeName')
        .populate('branch', 'branchName branchCode')
        .populate('createdBy', 'email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      total = await Room.countDocuments(searchQuery);
    } else {
      rooms = await Room.find(searchQuery)
        .populate('hostel', 'hostelName hostelCode')
        .populate('roomType', 'roomTypeName')
        .populate('branch', 'branchName branchCode')
        .populate('client', 'name')
        .populate('createdBy', 'email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      total = await Room.countDocuments(searchQuery);
    }

    res.status(200).json({ 
      rooms, 
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

// Get Room By ID
exports.getRoomById = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const room = await Room.findById(id)
      .populate('hostel', 'hostelName hostelCode type')
      .populate('roomType', 'roomTypeName capacity monthlyRent')
      .populate('branch', 'branchName branchCode')
      .populate('client', 'name')
      .populate('createdBy', 'email role');

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (admin.role === 'branchAdmin' && room.branch._id.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (admin.role === 'clientAdmin' && room.client._id.toString() !== admin.client.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.status(200).json({ room });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Room
exports.updateRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const { hostelId, floorNo, roomNo, roomTypeId, capacity, monthlyRent } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || (admin.role !== 'branchAdmin' && admin.role !== 'staffAdmin')) {
      return res.status(403).json({ message: 'Only branch admin or staff can update rooms' });
    }

    const room = await Room.findById(id);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (room.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (hostelId && hostelId !== room.hostel.toString()) {
      const hostel = await Hostel.findById(hostelId);
      if (!hostel) {
        return res.status(404).json({ message: 'Hostel not found' });
      }
      if (hostel.branch.toString() !== admin.branch.toString()) {
        return res.status(403).json({ message: 'Hostel does not belong to your branch' });
      }
      room.hostel = hostelId;
    }

    if (roomTypeId && roomTypeId !== room.roomType.toString()) {
      const roomType = await RoomType.findById(roomTypeId);
      if (!roomType) {
        return res.status(404).json({ message: 'Room type not found' });
      }
      if (roomType.branch.toString() !== admin.branch.toString()) {
        return res.status(403).json({ message: 'Room type does not belong to your branch' });
      }
      room.roomType = roomTypeId;
    }

    if (floorNo !== undefined) room.floorNo = floorNo;
    if (roomNo) room.roomNo = roomNo;
    if (capacity) room.capacity = capacity;
    if (monthlyRent !== undefined) room.monthlyRent = monthlyRent;

    await room.save();
    res.status(200).json({ message: 'Room updated successfully', room });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete Room
exports.deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || (admin.role !== 'branchAdmin' && admin.role !== 'staffAdmin')) {
      return res.status(403).json({ message: 'Only branch admin or staff can delete rooms' });
    }

    const room = await Room.findById(id);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (room.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Room.findByIdAndDelete(id);
    res.status(200).json({ message: 'Room deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Room Status
exports.updateRoomStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || (admin.role !== 'branchAdmin' && admin.role !== 'staffAdmin')) {
      return res.status(403).json({ message: 'Only branch admin or staff can update room status' });
    }

    if (!['available', 'occupied', 'maintenance'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be available, occupied, or maintenance' });
    }

    const room = await Room.findById(id);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (room.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    room.status = status;
    await room.save();

    res.status(200).json({ message: `Room status updated to ${status}`, room });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
