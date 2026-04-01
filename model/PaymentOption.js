const mongoose = require('mongoose');

const paymentOptionSchema = new mongoose.Schema({
  method: { type: String, enum: ['Online', 'Offline'], required: true },
  gateway: { type: String, required: true, trim: true },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  charges: { type: Number, default: 0, min: 0 },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true }
}, { timestamps: true });

paymentOptionSchema.index({ branch: 1, status: 1 });

module.exports = mongoose.model('PaymentOption', paymentOptionSchema);
