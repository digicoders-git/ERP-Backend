const mongoose = require('mongoose');

const stopLogSchema = new mongoose.Schema({
  trip: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip',
    required: true
  },
  stop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RouteStop',
    required: true
  },
  arrivalTime: {
    type: Date
  },
  departureTime: {
    type: Date
  },
  status: {
    type: String,
    enum: ['pending', 'arrived', 'departed'],
    default: 'pending'
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

// Ensure unique stop log per trip and stop
stopLogSchema.index({ trip: 1, stop: 1 }, { unique: true });

module.exports = mongoose.model('StopLog', stopLogSchema);
