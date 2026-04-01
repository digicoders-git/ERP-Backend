const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  date: { type: Date, required: true },
  type: { type: String, enum: ['student', 'staff'], required: true },
  // For student attendance
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
  sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section' },
  // For staff attendance
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  status: { type: String, enum: ['present', 'absent', 'late', 'half-day'], required: true },
  remark: { type: String, trim: true },
  markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
}, { timestamps: true });

attendanceSchema.index({ branch: 1, date: 1, type: 1 });
attendanceSchema.index({ branch: 1, studentId: 1, date: 1 });
attendanceSchema.index({ branch: 1, staffId: 1, date: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
