const mongoose = require('mongoose');

const marksheetTemplateSchema = new mongoose.Schema({
  templateName: {
    type: String,
    required: true,
    trim: true
  },
  templateFile: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    enum: ['pdf', 'image', 'html'],
    default: 'pdf'
  },
  fileSize: {
    type: Number
  },
  description: {
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

marksheetTemplateSchema.index({ branch: 1, client: 1 });

module.exports = mongoose.model('MarksheetTemplate', marksheetTemplateSchema);
