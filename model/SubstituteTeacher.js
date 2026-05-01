const mongoose = require('mongoose');

const substituteTeacherSchema = new mongoose.Schema({
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true },
  substituteTeacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  reason: { type: String, trim: true },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true }
}, { timestamps: true });

substituteTeacherSchema.index({ branch: 1, substituteTeacherId: 1 });
substituteTeacherSchema.index({ branch: 1, classId: 1, sectionId: 1 });

module.exports = mongoose.model('SubstituteTeacher', substituteTeacherSchema);
