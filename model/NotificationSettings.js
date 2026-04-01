const mongoose = require('mongoose');

const notificationSettingsSchema = new mongoose.Schema({
  emailNotifications: { type: Boolean, default: true },
  smsNotifications: { type: Boolean, default: true },
  absenceThreshold: { type: Number, default: 2, min: 1 },
  lateThreshold: { type: Number, default: 30, min: 5 },
  autoNotify: { type: Boolean, default: true },
  notifyParents: { type: Boolean, default: true },
  notifyAdmin: { type: Boolean, default: true },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, unique: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true }
}, { timestamps: true });

module.exports = mongoose.model('NotificationSettings', notificationSettingsSchema);
