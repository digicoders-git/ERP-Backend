const BedAllocation = require('../../model/BedAllocation');
const { successResponse,  errorResponse } = require('../../responseFormatter');

exports.getAll = async (req, res) => {
  try {
    const { roomId, status } = req.query;
    const filter = {};
    if (roomId) filter.roomId = roomId;
    if (status) filter.status = status;
    else filter.status = 'active'; 

    const Room = require('../../model/Room');
    const HostelStudent = require('../../model/HostelStudent');
    const Student = require('../../model/Student');

    let allocations = await BedAllocation.find(filter).sort({ createdAt: -1 }).lean();

    // Self-healing: Fetch latest student and room info for each allocation
    const enrichedAllocations = await Promise.all(allocations.map(async (allot) => {
      // 1. Try to fetch from HostelStudent first
      let student = await HostelStudent.findById(allot.studentId).lean();
      
      // 2. Fallback to Main School Student collection (Legacy)
      if (!student) {
        student = await Student.findById(allot.studentId).lean();
      }

      // 3. Update Name and Roll from the freshest record available
      const currentName = student ? (student.name || `${student.firstName} ${student.lastName}`) : allot.studentName;
      const rollNumber = student ? (student.rollNumber || student.rollNo || 'N/A') : 'N/A';

      return {
        ...allot,
        studentName: currentName,
        rollNumber: rollNumber,
        // Ensure room parity
        roomNo: allot.roomNumber
      };
    }));

    return successResponse(res, enrichedAllocations, 'Bed allocations fetched with fresh data');
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
    const HostelStudent = require('../../model/HostelStudent');

    const [room, student] = await Promise.all([
      Room.findById(roomId).lean(),
      HostelStudent.findById(studentId).lean()
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
      studentName: student.name,
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
