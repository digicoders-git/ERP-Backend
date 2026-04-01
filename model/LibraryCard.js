const mongoose = require('mongoose');

const libraryCardSchema = new mongoose.Schema({
  cardId: { type: String, required: true, trim: true },
  studentId: { type: String, required: true, trim: true },
  studentName: { type: String, required: true, trim: true },
  class: { type: String, required: true, trim: true },
  issueDate: { type: Date, required: true },
  expiryDate: { type: Date, required: true },
  status: { type: String, enum: ['Active', 'Expired', 'Revoked'], default: 'Active' },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true }
}, { timestamps: true });

libraryCardSchema.index({ branch: 1, status: 1 });
libraryCardSchema.index({ cardId: 1 });
libraryCardSchema.index({ studentId: 1 });

module.exports = mongoose.model('LibraryCard', libraryCardSchema);
