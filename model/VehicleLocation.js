const mongoose = require('mongoose');

const vehicleLocationSchema = new mongoose.Schema({
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  speed: { type: Number, default: 0 },
  heading: { type: Number, default: 0 },
  status: { type: String, enum: ['moving', 'stopped'], default: 'stopped' },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  recordedAt: { type: Date, default: Date.now }
}, { timestamps: false });

// TTL index — location records auto-delete after 24 hours
vehicleLocationSchema.index({ recordedAt: 1 }, { expireAfterSeconds: 86400 });
vehicleLocationSchema.index({ vehicle: 1, recordedAt: -1 });
vehicleLocationSchema.index({ branch: 1, recordedAt: -1 });

module.exports = mongoose.model('VehicleLocation', vehicleLocationSchema);
