const mongoose = require('mongoose');

const hostelLibraryFeeSchema = new mongoose.Schema({
  type: { type: String, enum: ['Hostel', 'Library'], required: true },
  category: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0 },
  description: { type: String, trim: true },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true }
}, { timestamps: true });

hostelLibraryFeeSchema.index({ branch: 1, type: 1 });

module.exports = mongoose.model('HostelLibraryFee', hostelLibraryFeeSchema);
