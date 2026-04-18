const mongoose = require('mongoose');
const hostelFeeSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  rollNumber: { type: String },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  bedNumber: { type: String },
  month: { type: String, required: true },
  roomRent: { type: Number, default: 0 },
  messCharges: { type: Number, default: 0 },
  otherCharges: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  paidAmount: { type: Number, default: 0 },
  status: { type: String, enum: ['Paid', 'Pending', 'Partial', 'Overdue'], default: 'Pending' },
  dueDate: { type: String },
  paidDate: { type: String },
  paymentMode: { type: String },
  lastPaymentDate: { type: String }
}, { timestamps: true });
module.exports = mongoose.model('HostelFee', hostelFeeSchema);
