const mongoose = require('mongoose');
const hostelAttendanceSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  rollNumber: { type: String },
  date: { type: String, required: true },
  attendanceType: { type: String, enum: ['morning', 'evening'], required: true },
  status: { type: String, enum: ['present', 'absent'], required: true }
}, { timestamps: true });
module.exports = mongoose.model('HostelAttendance', hostelAttendanceSchema);
