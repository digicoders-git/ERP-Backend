const mongoose = require('mongoose');

const performanceEvaluationSchema = new mongoose.Schema({
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher'
  },
  teacherName: {
    type: String,
    required: true
  },
  evaluationPeriod: {
    type: String,
    required: true
  },
  teachingQuality: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  studentEngagement: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  punctuality: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  professionalism: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  overallRating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  feedback: {
    type: String,
    trim: true
  },
  evaluatedBy: {
    type: String,
    required: true
  },
  evaluationDate: {
    type: Date,
    default: Date.now
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

performanceEvaluationSchema.index({ evaluationPeriod: 1 });
performanceEvaluationSchema.index({ overallRating: 1 });
performanceEvaluationSchema.index({ teacherName: 1 });

module.exports = mongoose.model('PerformanceEvaluation', performanceEvaluationSchema);
