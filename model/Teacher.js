const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
  customId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true
  },
  mobile: {
    type: String,
    required: true,
    trim: true
  },
  profileImage: {
    type: String,
    default: null
  },
  subjects: [{
    type: String,
    trim: true
  }],
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
  },
  assignedClass: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    default: null
  },
  assignedSection: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section',
    default: null
  }
}, { timestamps: true });

teacherSchema.index({ branch: 1, status: 1 });
teacherSchema.index({ client: 1, status: 1 });
teacherSchema.index({ email: 1 }, { unique: true, sparse: true });
teacherSchema.index({ customId: 1 }, { unique: true, sparse: true });
teacherSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Teacher', teacherSchema);
