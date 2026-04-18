const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    default: '12345678'
  },
  mobile: {
    type: String,
    required: true,
    trim: true
  },
  staffId: {
    type: String,
    unique: true,
    trim: true
  },
  profileImage: {
    type: String,
    default: null
  },
  designation: {
    type: String,
    trim: true
  },
  department: {
    type: String,
    trim: true
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    trim: true
  },
  qualification: {
    type: String,
    trim: true
  },
  experience: {
    type: String,
    trim: true
  },
  salary: {
    type: Number,
    min: 0
  },
  address: {
    type: String,
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
  },
  status: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

staffSchema.index({ branch: 1, status: 1 });
staffSchema.index({ client: 1, status: 1 });
staffSchema.index({ email: 1 });
staffSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Staff', staffSchema);
