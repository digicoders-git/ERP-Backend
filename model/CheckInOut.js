const mongoose = require('mongoose');
const checkInOutSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  rollNumber: { type: String },
  phone: { type: String },
  action: { type: String, enum: ['checkin', 'checkout'], required: true },
  date: { type: String, required: true },
  time: { type: String },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });
module.exports = mongoose.model('CheckInOut', checkInOutSchema);
