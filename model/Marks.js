const mongoose = require('mongoose');

const marksSchema = new mongoose.Schema({
  examSchedule: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'ExamSchedule', 
    required: true 
  },
  student: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Student', 
    required: true 
  },
  subject: { 
    type: String, 
    required: true 
  },
  theoryMarksObtained: { 
    type: Number, 
    default: 0 
  },
  practicalMarksObtained: { 
    type: Number, 
    default: 0 
  },
  marksObtained: { 
    type: Number, 
    required: true // Total (theory + practical)
  },
  totalMarks: { 
    type: Number, 
    required: true 
  },
  grade: { 
    type: String 
  },
  remarks: { 
    type: String 
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
  enteredBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Admin', 
    required: true 
  },
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft'
  },
  isLocked: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

marksSchema.index({ examSchedule: 1, student: 1, subject: 1 }, { unique: true });

module.exports = mongoose.models.Marks || mongoose.model('Marks', marksSchema);
