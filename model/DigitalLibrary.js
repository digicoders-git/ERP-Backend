const mongoose = require('mongoose');

const digitalLibrarySchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  subject: { type: String, required: true, trim: true },
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  stream: { type: String, default: null },
  fileUrl: { type: String, required: true },
  fileName: { type: String, required: true },
  fileSize: { type: String },
  uploadDate: { type: Date, default: Date.now },
  downloads: { type: Number, default: 0 },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true }
}, { timestamps: true });

digitalLibrarySchema.index({ branch: 1, subject: 1, class: 1 });

module.exports = mongoose.model('DigitalLibrary', digitalLibrarySchema);
