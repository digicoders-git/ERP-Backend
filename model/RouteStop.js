const mongoose = require('mongoose');

const routeStopSchema = new mongoose.Schema({
  route: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Route',
    required: true
  },
  stopName: {
    type: String,
    required: true,
    trim: true
  },
  stopOrder: {
    type: Number,
    required: true,
    min: 1
  },
  pickupTime: {
    type: String,
    required: true,
    trim: true
  },
  dropTime: {
    type: String,
    required: true,
    trim: true
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

module.exports = mongoose.model('RouteStop', routeStopSchema);
