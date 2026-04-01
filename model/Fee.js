const mongoose = require('mongoose');

const feeSchema = new mongoose.Schema({
  feeName: {
    type: String,
    required: true,
    trim: true
  },
  feeType: {
    type: String,
    enum: ['recurring', 'fixed'],
    required: true
  },
  frequency: {
    type: String,
    enum: ['monthly', 'yearly'],
    required: function() {
      return this.feeType === 'recurring';
    }
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: Boolean,
    default: true
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

module.exports = mongoose.model('Fee', feeSchema);
