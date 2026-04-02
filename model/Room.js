const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  hostel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hostel',
    required: true
  },
  floorNo: {
    type: Number,
    required: true,
    min: 0
  },
  roomNo: {
    type: String,
    required: true,
    trim: true
  },
  roomType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RoomType',
    required: true
  },
  capacity: {
    type: Number,
    required: true,
    min: 1
  },
  monthlyRent: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['available', 'occupied', 'maintenance'],
    default: 'available'
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

// Same roomNo not allowed on same floor in same hostel
roomSchema.index({ hostel: 1, floorNo: 1, roomNo: 1 }, { unique: true });

module.exports = mongoose.model('Room', roomSchema);
