const mongoose = require('mongoose');

const driverDocumentSchema = new mongoose.Schema({
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
  docType: {
    type: String,
    enum: ['Driving License', 'Medical Certificate', 'Vehicle Insurance', 'RC Book', 'Other'],
    required: true
  },
  number: { type: String, trim: true },
  issueDate: { type: Date },
  expiryDate: { type: Date },
  status: { type: String, enum: ['Valid', 'Expiring Soon', 'Expired'], default: 'Valid' },
  fileUrl: { type: String },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
}, { timestamps: true });

driverDocumentSchema.index({ driver: 1, docType: 1 });

module.exports = mongoose.model('DriverDocument', driverDocumentSchema);
