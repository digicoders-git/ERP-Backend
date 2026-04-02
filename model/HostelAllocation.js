const mongoose = require('mongoose');

const hostelAllocationSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true,
    trim: true
  },
  studentName: {
    type: String,
    required: true,
    trim: true
  },
  hostel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hostel',
    required: true
  },
  roomNo: {
    type: String,
    required: true,
    trim: true
  },
  joiningDate: {
    type: Date,
    required: true
  },
  monthlyRent: {
    type: Number,
    required: true,
    min: 0
  },
  securityDeposit: {
    type: Number,
    required: true,
    min: 0
  },
  remark: {
    type: String,
    trim: true
  },
  allocationStatus: {
    type: String,
    enum: ['allocated', 'cancelled'],
    default: 'allocated'
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  }
}, { timestamps: true });

// Ek student ka ek hi active allocation ho sakta hai
hostelAllocationSchema.index({ studentId: 1, allocationStatus: 1 });

module.exports = mongoose.model('HostelAllocation', hostelAllocationSchema);
