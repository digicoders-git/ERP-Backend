const mongoose = require('mongoose');

const examTypeSchema = new mongoose.Schema({
  examTypeName: {
    type: String,
    required: true,
    trim: true
  },
  examTypeCode: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  marksType: {
    type: String,
    enum: ['theory', 'theory+practical', 'full'],
    default: 'theory'
  },
  passingPercentage: {
    type: Number,
    default: 33
  },
  theoryMarks: {
    type: Number,
    default: 100
  },
  practicalMarks: {
    type: Number,
    default: 0
  },
  totalMarks: {
    type: Number,
    default: 100
  },
  marksheetTemplate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MarksheetTemplate',
    default: null
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  status: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

examTypeSchema.index({ branch: 1, client: 1, status: 1 });
examTypeSchema.index({ examTypeCode: 1 });

module.exports = mongoose.model('ExamType', examTypeSchema);
