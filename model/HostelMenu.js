const mongoose = require('mongoose');

const hostelMenuSchema = new mongoose.Schema({
  day: {
    type: String,
    enum: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    required: true
  },
  breakfast: {
    type: String,
    required: true,
    trim: true
  },
  lunch: {
    type: String,
    required: true,
    trim: true
  },
  dinner: {
    type: String,
    required: true,
    trim: true
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

hostelMenuSchema.index({ day: 1, branch: 1 }, { unique: true });

module.exports = mongoose.model('HostelMenu', hostelMenuSchema);
