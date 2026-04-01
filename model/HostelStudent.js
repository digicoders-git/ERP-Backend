const mongoose = require('mongoose');

const hostelStudentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  rollNumber: { type: String, required: true, trim: true },
  email: { type: String, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  address: { type: String, trim: true },
  parentName: { type: String, trim: true },
  parentPhone: { type: String, trim: true },
  course: { type: String, trim: true },
  year: { type: String, trim: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  bloodGroup: { type: String },
  dateOfBirth: { type: String },
  fatherName: { type: String },
  motherName: { type: String },
  emergencyContact: { type: String },
  admissionDate: { type: String },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

module.exports = mongoose.model('HostelStudent', hostelStudentSchema);
