const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true },
  title: { type: String, required: true, trim: true },
  subject: { type: String, required: true, trim: true },
  dueDate: { type: Date, required: true },
  totalStudents: { type: Number, required: true },
  submitted: { type: Number, default: 0 },
  description: { type: String, required: true, trim: true },
  marks: { type: Number, default: 0 },
  document: { type: String, default: null },
  image: { type: String, default: null },
  status: { type: String, enum: ['active', 'closed'], default: 'active' },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true }
}, { timestamps: true });

assignmentSchema.index({ branch: 1, createdAt: -1 });
assignmentSchema.index({ branch: 1, teacherId: 1 });
assignmentSchema.index({ branch: 1, class: 1, section: 1 });

module.exports = mongoose.model('Assignment', assignmentSchema);
