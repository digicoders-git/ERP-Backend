const mongoose = require('mongoose');
const bedAllocationSchema = new mongoose.Schema({
  roomId: { type: String, required: true },
  roomNumber: { type: String, required: true },
  bedNumber: { type: String, required: true },
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  allocatedDate: { type: String, required: true },
  status: { type: String, enum: ['active', 'deallocated'], default: 'active' }
}, { timestamps: true });
module.exports = mongoose.model('BedAllocation', bedAllocationSchema);
