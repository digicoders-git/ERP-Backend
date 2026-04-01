const mongoose = require('mongoose');
const visitorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String },
  purpose: { type: String, required: true },
  studentName: { type: String, required: true },
  roomNumber: { type: String },
  checkInTime: { type: String },
  checkOutTime: { type: String },
  status: { type: String, enum: ['checked-in', 'checked-out'], default: 'checked-in' },
  notes: { type: String },
  date: { type: String }
}, { timestamps: true });
module.exports = mongoose.model('Visitor', visitorSchema);
