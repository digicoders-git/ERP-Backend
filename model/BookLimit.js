const mongoose = require('mongoose');

const bookLimitSchema = new mongoose.Schema({
  class: { type: String, required: true, trim: true },
  maxBooks: { type: Number, required: true, min: 1 },
  maxDays: { type: Number, required: true, min: 1 },
  renewalAllowed: { type: Boolean, default: true },
  renewalTimes: { type: Number, default: 2, min: 0 },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true }
}, { timestamps: true });

bookLimitSchema.index({ branch: 1, class: 1 }, { unique: true });

module.exports = mongoose.model('BookLimit', bookLimitSchema);
