const mongoose = require('mongoose');

const transportAttendanceSchema = new mongoose.Schema({
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
  routeStop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RouteStop',
    required: true
  },
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  },
  studentName: {
    type: String
  },
  parentPhone: {
    type: String
  },
  parentEmail: {
    type: String
  },
  attendanceType: {
    type: String,
    enum: ['pickup', 'drop'],
    required: true
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late'],
    required: true
  },
  attendanceTime: {
    type: Date,
    default: Date.now
  },
  scheduledTime: {
    type: String // HH:MM format
  },
  latitude: {
    type: Number
  },
  longitude: {
    type: Number
  },
  location: {
    type: String
  },
  notes: {
    type: String
  },
  date: {
    type: Date,
    default: Date.now
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client'
  }
}, { timestamps: true });

// Index for faster queries
transportAttendanceSchema.index({ driver: 1, date: 1 });
transportAttendanceSchema.index({ route: 1, routeStop: 1, date: 1 });
transportAttendanceSchema.index({ student: 1, date: 1 });

module.exports = mongoose.model('TransportAttendance', transportAttendanceSchema);
