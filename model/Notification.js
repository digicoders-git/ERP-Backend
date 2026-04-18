const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['absence', 'late', 'leave', 'custom'],
    default: 'custom'
  },
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  recipients: { type: String, trim: true },
  recipientType: {
    type: [String],
    enum: ['parents', 'students', 'staff', 'teachers', 'all'],
    default: ['all']
  },
  recipientIds: [{
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'recipientModel'
  }],
  recipientModel: {
    type: String,
    enum: ['Parent', 'Student', 'Staff', 'Teacher'],
    default: 'Parent'
  },
  method: { type: String, enum: ['email', 'sms', 'both', 'in-app'], default: 'email' },
  status: { type: String, enum: ['sent', 'pending', 'failed'], default: 'pending' },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true }
}, { timestamps: true });

notificationSchema.index({ branch: 1, createdAt: -1 });
notificationSchema.index({ branch: 1, status: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
