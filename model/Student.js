const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  mobile: {
    type: String,
    trim: true
  },
  admissionNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  rollNumber: {
    type: String
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: true
  },
  dob: {
    type: Date,
    required: true
  },
  bloodGroup: {
    type: String
  },
  category: {
    type: String,
    enum: ['general', 'obc', 'sc', 'st', 'ews'],
    required: true
  },
  profileImage: {
    type: String
  },
  address: {
    type: String
  },
  permanentAddress: {
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true }
  },
  currentAddress: {
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true }
  },
  hasPreviousEducation: {
    type: String,
    enum: ['yes', 'no'],
    required: true
  },
  previousEducation: {
    previousCourseName: { type: String },
    previousSchoolName: { type: String },
    previousSchoolAddress: { type: String },
    previousMarksType: { type: String, enum: ['percentage', 'cgpa'] },
    previousPercentage: { type: Number },
    marksheet: { type: String },
    characterCertificate: { type: String },
    transferCertificate: { type: String },
    migrationCertificate: { type: String }
  },
  medicalCertificate: {
    type: String
  },
  casteCertificate: {
    type: String
  },
  documents: {
    marksheet: { type: String },
    characterCertificate: { type: String },
    transferCertificate: { type: String },
    birthCertificate: { type: String },
    aadharCard: { type: String }
  },
  stream: {
    type: String
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: false
  },
  section: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section'
  },
  fatherName: {
    type: String,
    trim: true
  },
  motherName: {
    type: String,
    trim: true
  },
  guardianInfo: {
    fatherName: { type: String, required: true, trim: true },
    motherName: { type: String, required: true, trim: true },
    guardianPhone: { type: String, required: true, trim: true },
    emergencyPhone: { type: String, required: true, trim: true }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'inactive'
  },
  admissionStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'rejected'],
    default: 'pending'
  },
  applicationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'enrolled'],
    default: 'pending'
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  verificationRemarks: {
    type: String
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  verifiedAt: {
    type: Date
  },
  enrolledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  enrolledAt: {
    type: Date
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

// Pre-save hook to ensure random admission ID
studentSchema.pre('save', function(next) {
  if (!this.admissionNumber) {
    const randomPart = Math.floor(Math.random() * 900) + 100; // 3-digit random
    this.admissionNumber = `STU-${randomPart}`;
  }
  next();
});

studentSchema.index({ branch: 1, status: 1 });
studentSchema.index({ class: 1, section: 1, status: 1 });
studentSchema.index({ client: 1, status: 1 });
studentSchema.index({ email: 1 });
studentSchema.index({ admissionNumber: 1 });
studentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Student', studentSchema);
