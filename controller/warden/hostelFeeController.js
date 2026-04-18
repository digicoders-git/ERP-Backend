const HostelFee = require('../../model/HostelFee');
const BedAllocation = require('../../model/BedAllocation');
const Room = require('../../model/Room');
const HostelStudent = require('../../model/HostelStudent');
const Student = require('../../model/Student');
const { successResponse,  errorResponse } = require('../../responseFormatter');

exports.getAll = async (req, res) => {
  try {
    const { status, month } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (month && month !== 'all') filter.month = month;
    
    const fees = await HostelFee.find(filter)
      .populate('roomId', 'roomNo')
      .sort({ createdAt: -1 })
      .lean();

    // Self-Healing Fetch: Link latest student data to records
    const enrichedFees = await Promise.all(fees.map(async (fee) => {
      let student = await HostelStudent.findById(fee.studentId).lean();
      if (!student) {
        student = await Student.findById(fee.studentId).lean();
      }
      
      return {
        ...fee,
        studentName: student ? (student.name || `${student.firstName} ${student.lastName}`) : fee.studentName,
        rollNumber: student ? (student.rollNumber) : fee.rollNumber,
        roomNumber: fee.roomId?.roomNo || 'N/A'
      };
    }));

    return successResponse(res, enrichedFees, 'Fees fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.create = async (req, res) => {
  try {
    const fee = new HostelFee(req.body);
    await fee.save();
    return successResponse(res, fee, 'Fee record created', 201);
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.collectPayment = async (req, res) => {
  try {
    const { amount, paymentMode } = req.body;
    const fee = await HostelFee.findById(req.params.id);
    if (!fee) return errorResponse(res, 'Not found', 404);
    fee.paidAmount = (fee.paidAmount || 0) + parseFloat(amount);
    fee.lastPaymentDate = new Date().toISOString().split('T')[0];
    if (paymentMode) fee.paymentMode = paymentMode;
    if (fee.paidAmount >= fee.totalAmount) {
      fee.status = 'Paid';
      fee.paidDate = new Date().toISOString().split('T')[0];
    } else {
      fee.status = 'Partial';
    }
    await fee.save();
    return successResponse(res, fee, 'Payment recorded');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.markAsPaid = async (req, res) => {
  try {
    const { paymentMode } = req.body;
    const fee = await HostelFee.findById(req.params.id);
    if (!fee) return errorResponse(res, 'Not found', 404);
    fee.status = 'Paid';
    fee.paidAmount = fee.totalAmount;
    fee.paidDate = new Date().toISOString().split('T')[0];
    fee.paymentMode = paymentMode;
    await fee.save();
    return successResponse(res, fee, 'Marked as paid');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.remove = async (req, res) => {
  try {
    const fee = await HostelFee.findByIdAndDelete(req.params.id);
    if (!fee) return errorResponse(res, 'Not found', 404);
    return successResponse(res, null, 'Deleted');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.getStats = async (req, res) => {
  try {
    const { month } = req.query;
    const filter = {};
    if (month && month !== 'all') filter.month = month;

    const fees = await HostelFee.find(filter).lean();
    const totalRevenue = fees.reduce((s, f) => s + (f.paidAmount || 0), 0);
    const pendingDues = fees.reduce((s, f) => s + (f.totalAmount - (f.paidAmount || 0)), 0);
    const paidCount = fees.filter(f => f.status === 'Paid').length;
    const avgPayment = fees.length ? Math.round(totalRevenue / fees.length) : 0;
    
    return successResponse(res, { 
      totalRevenue, 
      pendingDues, 
      paidCount, 
      avgPayment, 
      total: fees.length,
      currentFilter: month || 'all'
    }, 'Stats fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.generateMonthly = async (req, res) => {
  try {
    const { month } = req.body;
    if (!month) return errorResponse(res, 'Month is required', 400);

    const allocations = await BedAllocation.find({ status: 'active' }).lean();
    let createdCount = 0;
    let skippedCount = 0;

    for (const alloc of allocations) {
      // Check if fee already exists for this student in this month
      const existing = await HostelFee.findOne({ studentId: alloc.studentId, month });
      if (existing) {
        skippedCount++;
        continue;
      }

      // Fetch room details to get rent
      const room = await Room.findById(alloc.roomId).populate('roomType').lean();
      if (!room) continue;

      const roomRent = room.roomType?.monthlyRent || 0;
      const messCharges = 4500; // Default or could be fetched from mess plan
      const otherCharges = 500; // Maintenance/Electricity base
      const totalAmount = roomRent + messCharges + otherCharges;

      const fee = new HostelFee({
        studentId: alloc.studentId,
        studentName: alloc.studentName,
        rollNumber: alloc.rollNumber || 'N/A',
        roomId: alloc.roomId,
        bedNumber: alloc.bedNumber,
        month,
        roomRent,
        messCharges,
        otherCharges,
        totalAmount,
        status: 'Pending',
        dueDate: new Date().toISOString().split('T')[0]
      });

      await fee.save();
      createdCount++;
    }

    return successResponse(res, { createdCount, skippedCount }, `${createdCount} fee records generated successfully`);
  } catch (error) {
    return errorResponse(res, 'Server error during generation', 500, error);
  }
};
