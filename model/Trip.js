const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    required: true
  },
  route: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Route',
    required: true
  },
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true
  },
  type: {
    type: String,
    enum: ['morning', 'evening'],
    required: true
  },
  status: {
    type: String,
    enum: ['ongoing', 'completed', 'cancelled'],
    default: 'ongoing'
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  currentStopIndex: {
    type: Number,
    default: 0
  },
  trackingStatus: {
    type: String,
    enum: ['started', 'arrived', 'moving', 'completed'],
    default: 'started'
  },
  currentStop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RouteStop'
  },
  nextStop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RouteStop'
  },
  lastUpdated: {
    type: Date,
    default: Date.now
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
  }
}, { timestamps: true });

// Ensure only one ongoing trip per driver
tripSchema.index({ driver: 1, status: 1 }, { 
  unique: true, 
  partialFilterExpression: { status: 'ongoing' } 
});

module.exports = mongoose.model('Trip', tripSchema);
