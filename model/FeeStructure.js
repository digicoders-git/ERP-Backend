const mongoose = require('mongoose');

const feeStructureSchema = new mongoose.Schema({
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  tuitionFee: {
    type: Number,
    required: true,
    default: 0
  },
  examFee: {
    type: Number,
    required: true,
    default: 0
  },
  libraryFee: {
    type: Number,
    required: true,
    default: 0
  },
  sportsFee: {
    type: Number,
    required: true,
    default: 0
  },
  labFee: {
    type: Number,
    required: true,
    default: 0
  },
  totalFee: {
    type: Number,
    default: 0
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
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  }
}, { timestamps: true });

// Calculate total fee before saving
feeStructureSchema.pre('save', function(next) {
  this.totalFee = this.tuitionFee + this.examFee + this.libraryFee + this.sportsFee + this.labFee;
  next();
});

module.exports = mongoose.model('FeeStructure', feeStructureSchema);
