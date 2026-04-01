const mongoose = require('mongoose');
const hostelComplaintSchema = new mongoose.Schema({
  studentName: { type: String, required: true },
  studentId: { type: String },
  complaint: { type: String, required: true },
  category: { type: String, enum: ['Mess', 'Room', 'Maintenance', 'General', 'Other'], default: 'General' },
  status: { type: String, enum: ['pending', 'resolved', 'in-progress'], default: 'pending' },
  date: { type: String },
  resolvedBy: { type: String },
  resolvedAt: { type: Date }
}, { timestamps: true });
module.exports = mongoose.model('HostelComplaint', hostelComplaintSchema);
