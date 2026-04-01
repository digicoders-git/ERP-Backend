const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  planName: {
    type: String,
    required: true,
    trim: true
  },
  planType: {
    type: String,
    enum: ['Per Student Basis', 'Monthly Fixed Price', 'Yearly Fixed Price'],
    required: true
  },
  pricePerStudent: {
    type: Number,
    default: 0
  },
  monthlyPrice: {
    type: Number,
    default: 0
  },
  yearlyPrice: {
    type: Number,
    default: 0
  },
  panelsIncluded: [{
    type: String,
    enum: ['school', 'staff', 'fee', 'warden', 'library', 'transport', 'teacher', 'parent', 'student']
  }],
  maxBranches: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Plan', planSchema);
