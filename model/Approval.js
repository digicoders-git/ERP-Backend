const mongoose = require('mongoose');

const approvalSchema = new mongoose.Schema({
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  type: {
    type: String,
    enum: ['Student Admission', 'Leave Request', 'Fee Waiver', 'Transfer Certificate', 'Event Approval', 'Budget Request'],
    required: true
  },
  title: { type: String },
  name: { type: String, required: true },
  department: { type: String },
  class: { type: String },
  priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
  description: { type: String },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
}, { timestamps: true });

module.exports = mongoose.model('Approval', approvalSchema);
