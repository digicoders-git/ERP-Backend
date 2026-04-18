const mongoose = require('mongoose');

const vehicleChecklistSchema = new mongoose.Schema({
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  date: { type: String, required: true },
  brakes: { type: Boolean, default: null },
  lights: { type: Boolean, default: null },
  horn: { type: Boolean, default: null },
  fuel: { type: Boolean, default: null },
  tyres: { type: Boolean, default: null },
  engine: { type: Boolean, default: null },
  mirrors: { type: Boolean, default: null },
  seatbelts: { type: Boolean, default: null },
  firstAid: { type: Boolean, default: null },
  fireExtinguisher: { type: Boolean, default: null },
  notes: { type: String, trim: true },
  status: { type: String, enum: ['All Good', 'Minor Issues', 'Major Issues'], default: 'All Good' },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true }
}, { timestamps: true });

vehicleChecklistSchema.index({ driver: 1, date: -1 });
vehicleChecklistSchema.index({ branch: 1, date: -1 });

module.exports = mongoose.model('VehicleChecklist', vehicleChecklistSchema);
