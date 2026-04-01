const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  vehicleNo: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  vehicleType: {
    type: String,
    enum: ['bus', 'van', 'auto'],
    required: true
  },
  vehicleCapacity: {
    type: Number,
    required: true,
    min: 1
  },
  fuelType: {
    type: String,
    enum: ['diesel', 'petrol', 'cng', 'electric'],
    required: true
  },
  rcNo: {
    type: String,
    required: true,
    trim: true
  },
  insuranceExpiryDate: {
    type: Date,
    required: true
  },
  fitnessExpiryDate: {
    type: Date,
    required: true
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

module.exports = mongoose.model('Vehicle', vehicleSchema);
