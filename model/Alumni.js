const mongoose = require('mongoose');

const alumniSchema = new mongoose.Schema({
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  name: { type: String, required: true, trim: true },
  batch: { type: String, required: true, trim: true },
  department: { type: String, required: true, trim: true },
  currentRole: { type: String, trim: true },
  location: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  achievements: { type: String, trim: true },
  bio: { type: String, trim: true },
  mentorship: { type: Boolean, default: false },
  profileImage: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
}, { timestamps: true });

alumniSchema.index({ branch: 1, batch: 1 });

module.exports = mongoose.model('Alumni', alumniSchema);
