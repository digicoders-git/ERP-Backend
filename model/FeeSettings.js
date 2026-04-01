const mongoose = require('mongoose');

const feeSettingsSchema = new mongoose.Schema({
  schoolName: { type: String, trim: true },
  academicYear: { type: String, default: '2024-2025' },
  currency: { type: String, default: 'INR' },
  currencySymbol: { type: String, default: '₹' },
  phone: { type: String, trim: true },
  email: { type: String, trim: true },
  website: { type: String, trim: true },
  address: { type: String, trim: true },
  notifications: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    push: { type: Boolean, default: false }
  },
  feeSettings: {
    lateFeePercentage: { type: Number, default: 0 },
    gracePeriodDays: { type: Number, default: 0 },
    autoReminders: { type: Boolean, default: false }
  },
  theme: { type: String, default: 'light' },
  language: { type: String, default: 'en' },
  dateFormat: { type: String, default: 'DD/MM/YYYY' },
  timeFormat: { type: String, default: '12' },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, unique: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true }
}, { timestamps: true });

module.exports = mongoose.model('FeeSettings', feeSettingsSchema);
