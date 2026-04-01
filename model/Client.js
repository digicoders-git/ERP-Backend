const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  principal: {
    type: String,
    trim: true
  },
  established: {
    type: Number,
    min: 1900,
    max: 2100
  },
  capacity: {
    type: Number,
    default: 0,
    min: 0
  },
  students: {
    type: Number,
    default: 0,
    min: 0
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  plan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
    required: true
  },
  purchasedPanels: [{
    type: String,
    enum: ['school', 'staff', 'fee', 'warden', 'library', 'transport', 'teacher', 'parent', 'student']
  }],
  maxBranches: {
    type: Number,
    default: 0,
    min: 0
  },
  currentBranchCount: {
    type: Number,
    default: 0,
    min: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('Client', clientSchema);
