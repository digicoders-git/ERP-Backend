const BedAllocation = require('../../model/BedAllocation');
const { successResponse,  errorResponse } = require('../../responseFormatter');

exports.getAll = async (req, res) => {
  try {
    const { roomId, status } = req.query;
    const filter = {};
    if (roomId) filter.roomId = roomId;
    if (status) filter.status = status;
    else filter.status = 'active'; // default only active
    const allocations = await BedAllocation.find(filter).sort({ createdAt: -1 }).lean();
    return successResponse(res, allocations, 'Bed allocations fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.allocate = async (req, res) => {
  try {
    const { roomId, bedNumber, studentId } = req.body;
    if (!roomId || !bedNumber || !studentId) return errorResponse(res, 'roomId, bedNumber and studentId required', 400);

    // Fetch room and student by ID
    const Room = require('../../model/Room');
    const Student = require('../../model/Student');

    const [room, student] = await Promise.all([
      Room.findById(roomId).lean(),
      Student.findById(studentId).lean()
    ]);

    if (!room) return errorResponse(res, 'Room not found', 404);
    if (!student) return errorResponse(res, 'Student not found', 404);

    // Check if bed already occupied
    const existing = await BedAllocation.findOne({ roomId, bedNumber, status: 'active' });
    if (existing) return errorResponse(res, 'Bed already occupied', 400);

    // Check if student already has a bed
    const studentBed = await BedAllocation.findOne({ studentId, status: 'active' });
    if (studentBed) return errorResponse(res, `Student already allocated to bed ${studentBed.bedNumber} in room ${studentBed.roomNumber}`, 400);

    const allocation = new BedAllocation({
      roomId,
      bedNumber,
      studentId,
      roomNumber: room.roomNo,
      studentName: `${student.firstName} ${student.lastName}`,
      allocatedDate: req.body.allocatedDate || new Date().toISOString().split('T')[0]
    });
    await allocation.save();
    return successResponse(res, allocation, 'Bed allocated', 201);
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.deallocate = async (req, res) => {
  try {
    const allocation = await BedAllocation.findByIdAndUpdate(
      req.params.id,
      { status: 'deallocated' },
      { new: true }
    );
    if (!allocation) return errorResponse(res, 'Not found', 404);
    return successResponse(res, allocation, 'Bed deallocated');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.getByStudent = async (req, res) => {
  try {
    const allocation = await BedAllocation.findOne({ studentId: req.params.studentId, status: 'active' }).lean();
    return successResponse(res, allocation, 'Fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.getStats = async (req, res) => {
  try {
    const [totalBeds, occupiedBeds] = await Promise.all([
      BedAllocation.countDocuments(),
      BedAllocation.countDocuments({ status: 'active' })
    ]);
    return successResponse(res, { totalBeds, occupiedBeds, availableBeds: totalBeds - occupiedBeds }, 'Stats fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};
