const mongoose = require('mongoose');

const teacherAttendanceSchema = new mongoose.Schema({
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher'
  },
  teacherName: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['Present', 'Absent', 'Late', 'Leave'],
    default: 'Present'
  },
  checkIn: {
    type: String
  },
  checkOut: {
    type: String
  },
  workingHours: {
    type: Number,
    default: 0,
    min: 0
  },
  remarks: {
    type: String,
    trim: true
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client'
  }
}, { timestamps: true });

teacherAttendanceSchema.index({ date: 1 });
teacherAttendanceSchema.index({ status: 1 });
teacherAttendanceSchema.index({ teacherName: 1 });

module.exports = mongoose.model('TeacherAttendance', teacherAttendanceSchema);
