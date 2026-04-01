const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const parentStudentSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, trim: true },
  mobile: { type: String, required: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'parent', 'warden'], required: true },

  // Student specific
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  rollNumber: { type: String, trim: true },
  class: { type: String, trim: true },
  section: { type: String, trim: true },

  // Parent specific — linked children
  children: [{
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    name: { type: String },
    class: { type: String },
    section: { type: String },
    rollNo: { type: String }
  }],

  // Warden specific
  wardenId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warden' },

  status: { type: Boolean, default: true },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true }
}, { timestamps: true });

parentStudentSchema.index({ mobile: 1, role: 1 });
parentStudentSchema.index({ branch: 1, role: 1 });

parentStudentSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

parentStudentSchema.methods.comparePassword = async function (pwd) {
  return bcrypt.compare(pwd, this.password);
};

module.exports = mongoose.model('ParentStudent', parentStudentSchema);
