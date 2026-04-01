const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true, trim: true },
  type: { type: String, enum: ['multiple-choice', 'true-false'], default: 'multiple-choice' },
  options: [{ type: String, trim: true }],
  correctAnswer: { type: Number, required: true },
  points: { type: Number, default: 1 }
}, { _id: false });

const staffQuizSchema = new mongoose.Schema({
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  title: { type: String, required: true, trim: true },
  subject: { type: String, trim: true },
  class: { type: String, trim: true },
  timeLimit: { type: Number, default: 30 },
  questions: [questionSchema],
  totalPoints: { type: Number, default: 0 },
  status: { type: String, enum: ['draft', 'published'], default: 'draft' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
}, { timestamps: true });

staffQuizSchema.index({ branch: 1, status: 1 });

module.exports = mongoose.model('StaffQuiz', staffQuizSchema);
