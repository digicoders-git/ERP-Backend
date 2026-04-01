const mongoose = require('mongoose');
const hostelServiceSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  serviceType: { type: String, required: true },
  serviceCategory: { type: String, enum: ['Laundry', 'Hair Cutting', 'Shoe Polish', 'Other'], default: 'Other' },
  description: { type: String },
  date: { type: String, required: true },
  time: { type: String },
  status: { type: String, enum: ['Pending', 'Completed'], default: 'Pending' }
}, { timestamps: true });
module.exports = mongoose.model('HostelService', hostelServiceSchema);
