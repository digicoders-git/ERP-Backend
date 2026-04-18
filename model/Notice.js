const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['general', 'academic', 'event', 'urgent', 'holiday'],
    required: true
  },
  targetAudience: [{
    type: String,
    enum: ['student', 'teacher', 'parent', 'staff', 'admin', 'driver', 'fee_manager'],
    default: ['student']
  }],
  class: {
    type: String,
    trim: true,
    default: 'All'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'medium', 'high'],
    default: 'normal'
  },
  publishDate: {
    type: Date,
    default: Date.now
  },
  expiryDate: {
    type: Date,
    default: () => new Date(+new Date() + 30*24*60*60*1000) // 30 days default
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  attachments: [{
    type: String
  }],
  isPublished: {
    type: Boolean,
    default: false
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

module.exports = mongoose.model('Notice', noticeSchema);
