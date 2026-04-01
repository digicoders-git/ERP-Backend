const mongoose = require('mongoose');

const scholarshipDiscountSchema = new mongoose.Schema({
  studentId: { type: String, required: true, trim: true },
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ['Scholarship', 'Discount'], required: true },
  amount: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 },
  reason: { type: String, trim: true },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true }
}, { timestamps: true });

scholarshipDiscountSchema.index({ branch: 1, type: 1 });
scholarshipDiscountSchema.index({ branch: 1, studentId: 1 });

module.exports = mongoose.model('ScholarshipDiscount', scholarshipDiscountSchema);
