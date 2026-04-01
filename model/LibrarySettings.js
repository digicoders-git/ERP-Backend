const mongoose = require('mongoose');

const librarySettingsSchema = new mongoose.Schema({
  libraryName: { type: String, default: 'Central Library System', trim: true },
  maxBooksPerMember: { type: Number, default: 3, min: 1 },
  loanPeriodDays: { type: Number, default: 14, min: 1 },
  finePerDay: { type: Number, default: 5, min: 0 },
  maxRenewalTimes: { type: Number, default: 2, min: 0 },
  emailNotifications: { type: Boolean, default: true },
  smsNotifications: { type: Boolean, default: false },
  autoReminders: { type: Boolean, default: true },
  theme: { type: String, default: 'light' },
  font: { type: String, default: 'sans' },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, unique: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true }
}, { timestamps: true });

module.exports = mongoose.model('LibrarySettings', librarySettingsSchema);
