const mongoose = require('mongoose');
const leaveGatePassSchema = new mongoose.Schema({
  studentName: { type: String, required: true },
  studentId: { type: String, required: true },
  requestType: { type: String, enum: ['leave', 'gatepass'], required: true },
  leaveType: { type: String, enum: ['casual', 'medical', 'emergency'], default: 'casual' },
  startDate: { type: String, required: true },
  endDate: { type: String },
  reason: { type: String, required: true },
  destination: { type: String },
  parentContact: { type: String },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approvedBy: { type: String },
  approvalDate: { type: String },
  rejectionReason: { type: String },
  createdDate: { type: String }
}, { timestamps: true });
module.exports = mongoose.model('LeaveGatePass', leaveGatePassSchema);
