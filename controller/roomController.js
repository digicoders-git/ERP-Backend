const Room = require('../model/Room');
const Hostel = require('../model/Hostel');
const RoomType = require('../model/RoomType');
const Admin = require('../model/Admin');

// Create Room
exports.createRoom = async (req, res) => {
  try {
    const { hostelId, floorNo, roomNo, roomTypeId, capacity, monthlyRent } = req.body;
    const user = req.user;

    if (!user || (!['branchAdmin', 'staffAdmin', 'superAdmin'].includes(user.role))) {
      return res.status(403).json({ message: 'Only admins or staff can create rooms' });
    }

    const hostel = await Hostel.findById(hostelId);
    if (!hostel) {
      return res.status(404).json({ message: 'Hostel not found' });
    }

    if (hostel.branch.toString() !== user.branch.toString()) {
      return res.status(403).json({ message: 'Hostel does not belong to your branch' });
    }

    const roomType = await RoomType.findById(roomTypeId);
    if (!roomType) {
      return res.status(404).json({ message: 'Room type not found' });
    }

    if (roomType.branch.toString() !== user.branch.toString()) {
      return res.status(403).json({ message: 'Room type does not belong to your branch' });
    }

    const duplicate = await Room.findOne({ hostel: hostelId, floorNo, roomNo });
    if (duplicate) {
      return res.status(400).json({ message: `Room ${roomNo} already exists on floor ${floorNo} in this hostel` });
    }

    const newRoom = new Room({
      hostel: hostelId,
      floorNo,
      roomNo,
      roomType: roomTypeId,
      capacity,
      monthlyRent,
      branch: user.branch,
      client: user.client,
      createdBy: user._id
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
    const user = req.user;

    if (!user) {
      return res.status(404).json({ message: 'User context not found' });
    }

    const searchQuery = search ? {
      $or: [
        { roomNo: { $regex: search, $options: 'i' } }
      ]
    } : {};

    // Permission Based Filtering
    if (user.role === 'branchAdmin' || user.role === 'staffAdmin' || user.role === 'warden') {
      searchQuery.branch = user.branch;
      if (user.role === 'warden' && user.assignedHostel) {
        searchQuery.hostel = user.assignedHostel;
      }
    } else if (user.role === 'clientAdmin') {
      searchQuery.client = user.client;
    }

    const rooms = await Room.find(searchQuery)
      .populate('hostel', 'hostelName hostelCode')
      .populate('roomType', 'roomTypeName')
      .populate('branch', 'branchName branchCode')
      .populate('createdBy', 'email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Room.countDocuments(searchQuery);

    res.status(200).json({ 
      success: true,
      data: rooms,
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
    const user = req.user;

    if (!user) {
      return res.status(404).json({ message: 'User context not found' });
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

    if (user.role === 'branchAdmin' && room.branch.toString() !== user.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (user.role === 'warden' && room.hostel.toString() !== user.assignedHostel.toString()) {
      return res.status(403).json({ message: 'Access denied to this hostel room' });
    }

    if (user.role === 'clientAdmin' && room.client.toString() !== user.client.toString()) {
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
    const user = req.user;

    if (!user || (!['branchAdmin', 'staffAdmin'].includes(user.role))) {
      return res.status(403).json({ message: 'Only branch admin or staff can update rooms' });
    }

    const room = await Room.findById(id);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (room.branch.toString() !== user.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (hostelId && hostelId !== room.hostel.toString()) {
      const hostel = await Hostel.findById(hostelId);
      if (!hostel) return res.status(404).json({ message: 'Hostel not found' });
      if (hostel.branch.toString() !== user.branch.toString()) {
        return res.status(403).json({ message: 'Hostel does not belong to your branch' });
      }
      room.hostel = hostelId;
    }

    if (roomTypeId && roomTypeId !== room.roomType.toString()) {
      const roomType = await RoomType.findById(roomTypeId);
      if (!roomType) return res.status(404).json({ message: 'Room type not found' });
      if (roomType.branch.toString() !== user.branch.toString()) {
        return res.status(403).json({ message: 'Room type does not belong to your branch' });
      }
      room.roomType = roomTypeId;
    }

    if (floorNo !== undefined) room.floorNo = floorNo;
    if (roomNo) room.roomNo = roomNo;
    if (capacity) room.capacity = capacity;
    if (monthlyRent !== undefined) room.monthlyRent = monthlyRent;

    const targetHostel = hostelId || room.hostel.toString();
    const targetFloor = floorNo !== undefined ? floorNo : room.floorNo;
    const targetRoomNo = roomNo || room.roomNo;
    const duplicate = await Room.findOne({ hostel: targetHostel, floorNo: targetFloor, roomNo: targetRoomNo, _id: { $ne: id } });
    if (duplicate) {
      return res.status(400).json({ message: `Room ${targetRoomNo} already exists on floor ${targetFloor} in this hostel` });
    }

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
    const user = req.user;

    if (!user || (!['branchAdmin', 'staffAdmin'].includes(user.role))) {
      return res.status(403).json({ message: 'Only branch admin or staff can delete rooms' });
    }

    const room = await Room.findById(id);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (room.branch.toString() !== user.branch.toString()) {
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
    const user = req.user;

    if (!user || (!['branchAdmin', 'staffAdmin', 'warden'].includes(user.role))) {
      return res.status(403).json({ message: 'Permission denied to update status' });
    }

    if (!['available', 'occupied', 'maintenance'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const room = await Room.findById(id);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (user.role === 'branchAdmin' && room.branch.toString() !== user.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    if (user.role === 'warden' && room.hostel.toString() !== user.assignedHostel.toString()) {
      return res.status(403).json({ message: 'Access denied to this hostel' });
    }

    room.status = status;
    await room.save();

    res.status(200).json({ message: `Room status updated to ${status}`, room });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
