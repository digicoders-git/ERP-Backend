const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  staffName: { type: String, trim: true },
  leaveType: {
    type: String,
    enum: ['Sick Leave', 'Annual Leave', 'Maternity Leave', 'Paternity Leave', 'Emergency Leave', 'Casual Leave', 'Parental Leave', 'Medical', 'Other'],
    required: true
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  days: { type: Number },
  reason: { type: String, required: true, trim: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  reviewNote: { type: String, trim: true },
  appliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
}, { timestamps: true });

leaveSchema.index({ branch: 1, status: 1 });
leaveSchema.index({ branch: 1, createdAt: -1 });

module.exports = mongoose.model('Leave', leaveSchema);
