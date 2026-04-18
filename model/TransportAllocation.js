const mongoose = require('mongoose');

const transportAllocationSchema = new mongoose.Schema({
  userName: {
    type: String,
    required: true,
    trim: true
  },
  userType: {
    type: String,
    enum: ['student', 'staff'],
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  },
  staff: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
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
  monthlyCharges: {
    type: Number,
    required: true,
    min: 0
  },
  service: {
    type: String,
    enum: ['pickup only', 'drop only', 'both'],
    required: true
  },
  joiningDate: {
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

module.exports = mongoose.model('TransportAllocation', transportAllocationSchema);
