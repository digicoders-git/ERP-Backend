const mongoose = require('mongoose');

const studentDocumentSchema = new mongoose.Schema({
  studentName: { type: String, required: true, trim: true },
  studentId: { type: String, trim: true },
  type: {
    type: String,
    enum: ['Marksheet', 'ID Proof', 'Photo', 'Transfer Certificate', 'Birth Certificate', 'Address Proof', 'Other'],
    required: true
  },
  fileUrl: { type: String },
  fileName: { type: String },
  fileSize: { type: String },
  status: { type: String, enum: ['verified', 'pending', 'rejected'], default: 'pending' },
  uploadDate: { type: Date, default: Date.now },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true }
}, { timestamps: true });

studentDocumentSchema.index({ branch: 1, status: 1 });
studentDocumentSchema.index({ branch: 1, studentId: 1 });

module.exports = mongoose.model('StudentDocument', studentDocumentSchema);
