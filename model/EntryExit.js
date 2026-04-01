const mongoose = require('mongoose');
const entryExitSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  rollNumber: { type: String },
  phone: { type: String },
  room: { type: String, default: 'Not Assigned' },
  action: { type: String, enum: ['entry', 'exit'], required: true },
  purpose: { type: String },
  date: { type: String, required: true },
  time: { type: String },
  timestamp: { type: Date, default: Date.now },
  status: { type: String, default: 'Completed' }
}, { timestamps: true });
module.exports = mongoose.model('EntryExit', entryExitSchema);
