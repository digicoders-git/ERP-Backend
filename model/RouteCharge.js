const mongoose = require('mongoose');

const routeChargeSchema = new mongoose.Schema({
  route: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Route',
    required: true
  },
  routeStop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RouteStop'
  },
  monthlyCharge: {
    type: Number,
    required: true,
    min: 0
  },
  tripType: {
    type: String,
    enum: ['one way', 'two way'],
    required: true
  },
  effectiveFrom: {
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

module.exports = mongoose.model('RouteCharge', routeChargeSchema);
