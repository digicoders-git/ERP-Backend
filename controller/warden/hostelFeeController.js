const HostelFee = require('../../model/HostelFee');
const { successResponse,  errorResponse } = require('../../responseFormatter');

exports.getAll = async (req, res) => {
  try {
    const { status, month } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (month) filter.month = month;
    const fees = await HostelFee.find(filter).sort({ createdAt: -1 }).lean();
    return successResponse(res, fees, 'Fees fetched');
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
    const fees = await HostelFee.find().lean();
    const totalRevenue = fees.reduce((s, f) => s + (f.paidAmount || 0), 0);
    const pendingDues = fees.reduce((s, f) => s + (f.totalAmount - (f.paidAmount || 0)), 0);
    const paidCount = fees.filter(f => f.status === 'Paid').length;
    const avgPayment = fees.length ? Math.round(totalRevenue / fees.length) : 0;
    return successResponse(res, { totalRevenue, pendingDues, paidCount, avgPayment, total: fees.length }, 'Stats fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};
