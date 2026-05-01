const mongoose = require('mongoose');

const templateMappingSchema = new mongoose.Schema({
  examType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExamType',
    required: true
  },
  classes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  }],
  template: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MarksheetTemplate',
    required: true
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

templateMappingSchema.index({ examType: 1, branch: 1 });

module.exports = mongoose.model('TemplateMapping', templateMappingSchema);
