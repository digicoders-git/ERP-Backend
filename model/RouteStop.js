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
  stopLocation: {
    type: String,
    trim: true
  },
  latitude: {
    type: Number
  },
  longitude: {
    type: Number
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
  waitingTime: {
    type: Number, // in minutes
    default: 5
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

// Geospatial index for location-based queries
routeStopSchema.index({ latitude: 1, longitude: 1 });

module.exports = mongoose.model('RouteStop', routeStopSchema);
