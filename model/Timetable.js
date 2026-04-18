const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema({
  day: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    required: true
  },
  className: { type: String, trim: true },       // legacy field
  classTime: { type: String, trim: true },        // legacy field e.g. "09:00-10:00"
  startTime: { type: String, trim: true },        // e.g. "09:00"
  endTime: { type: String, trim: true },          // e.g. "10:00"
  subject: { type: String, required: true, trim: true },
  room: { type: String, trim: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
  sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section' },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  teacherName: { type: String, trim: true },     // stored name directly for easy display
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true }
}, { timestamps: true });

timetableSchema.index({ branch: 1, day: 1 });
timetableSchema.index({ branch: 1, teacherId: 1, day: 1 });
timetableSchema.index({ branch: 1, classId: 1, sectionId: 1 });
timetableSchema.index({ classId: 1, sectionId: 1, day: 1 });
module.exports = mongoose.model('Timetable', timetableSchema);
