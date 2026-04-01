const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  title: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: ['PTM', 'Annual Day', 'Sports', 'Academic', 'Cultural', 'Holiday', 'Other'],
    required: true
  },
  date: { type: Date, required: true },
  startTime: { type: String, trim: true },
  endTime: { type: String, trim: true },
  venue: { type: String, trim: true },
  description: { type: String, trim: true },
  organizer: { type: String, trim: true },
  attendees: { type: Number, default: 0 },
  status: { type: String, enum: ['upcoming', 'completed', 'cancelled'], default: 'upcoming' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
}, { timestamps: true });

eventSchema.index({ branch: 1, status: 1, date: 1 });

module.exports = mongoose.model('Event', eventSchema);
