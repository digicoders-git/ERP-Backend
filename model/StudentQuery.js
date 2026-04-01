const mongoose = require('mongoose');
const studentQuerySchema = new mongoose.Schema({
  studentName: { type: String, required: true },
  rollNumber: { type: String },
  category: { type: String, enum: ['Maintenance', 'Mess', 'Room', 'General', 'Other'], default: 'General' },
  subject: { type: String, required: true },
  description: { type: String },
  priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
  status: { type: String, enum: ['Pending', 'In Progress', 'Resolved', 'Closed'], default: 'Pending' },
  reply: { type: String },
  repliedDate: { type: String },
  submittedDate: { type: String }
}, { timestamps: true });
module.exports = mongoose.model('StudentQuery', studentQuerySchema);
