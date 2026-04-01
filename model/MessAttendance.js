const mongoose = require('mongoose');
const messAttendanceSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  date: { type: String, required: true },
  breakfast: { type: Boolean, default: false },
  lunch: { type: Boolean, default: false },
  dinner: { type: Boolean, default: false }
}, { timestamps: true });
module.exports = mongoose.model('MessAttendance', messAttendanceSchema);
