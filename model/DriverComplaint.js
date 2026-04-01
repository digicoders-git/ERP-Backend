const mongoose = require('mongoose');

const driverComplaintSchema = new mongoose.Schema({
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
  reportType: { type: String, enum: ['emergency', 'complaint'], required: true },
  category: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  status: { type: String, enum: ['Pending', 'In Progress', 'Resolved'], default: 'Pending' },
  resolvedNote: { type: String, trim: true },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true }
}, { timestamps: true });

driverComplaintSchema.index({ driver: 1, createdAt: -1 });
driverComplaintSchema.index({ branch: 1, status: 1 });

module.exports = mongoose.model('DriverComplaint', driverComplaintSchema);
