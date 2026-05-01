const mongoose = require('mongoose');

const transportNotificationSchema = new mongoose.Schema({
  notificationType: {
    type: String,
    enum: ['van_departing', 'student_dropped', 'trip_started', 'trip_ended'],
    required: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },

  trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' },
  fromStop: { type: mongoose.Schema.Types.ObjectId, ref: 'RouteStop' },
  nextStop: { type: mongoose.Schema.Types.ObjectId, ref: 'RouteStop' },

  // Students at the next stop who will receive the notification
  targetStudents: [{
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    studentName: { type: String },
    parentPhone: { type: String },   // guardianInfo.guardianPhone
    emergencyPhone: { type: String } // guardianInfo.emergencyPhone
  }],

  // Parent accounts found in ParentStudent model
  parentAccounts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ParentStudent'
  }],

  deliveredTo: {
    students: { type: Number, default: 0 },
    parents: { type: Number, default: 0 }
  },

  isRead: { type: Boolean, default: false },
  status: { type: String, enum: ['sent', 'pending', 'failed'], default: 'sent' },

  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId } // Driver ID
}, { timestamps: true });

transportNotificationSchema.index({ branch: 1, createdAt: -1 });
transportNotificationSchema.index({ trip: 1, notificationType: 1 });
transportNotificationSchema.index({ 'targetStudents.student': 1 });

module.exports = mongoose.model('TransportNotification', transportNotificationSchema);
