const mongoose = require('mongoose');

const idCardSchema = new mongoose.Schema({
  roleType: {
    type: String,
    enum: ['staff', 'teacher', 'student', 'driver', 'warden'],
    required: true
  },
  
  // Reference to the person
  staffId: mongoose.Schema.Types.ObjectId,
  teacherId: mongoose.Schema.Types.ObjectId,
  studentId: mongoose.Schema.Types.ObjectId,
  driverId: mongoose.Schema.Types.ObjectId,
  wardenId: mongoose.Schema.Types.ObjectId,
  
  // Card details
  cardNumber: {
    type: String,
    unique: true,
    required: true
  },
  
  // Personal info snapshot (for record)
  name: String,
  email: String,
  mobile: String,
  profileImage: String,
  
  // Role-specific info
  staffInfo: {
    designation: String,
    department: String,
    qualification: String,
    experience: String
  },
  
  teacherInfo: {
    subject: String,
    qualification: String
  },
  
  studentInfo: {
    rollNumber: String,
    class: String,
    section: String,
    fatherName: String,
    dob: String,
    bloodGroup: String
  },
  
  driverInfo: {
    licenseNumber: String,
    vehicleNumber: String
  },
  
  wardenInfo: {
    hostelName: String,
    designation: String
  },
  
  // Card validity
  issueDate: {
    type: Date,
    default: Date.now
  },
  
  expiryDate: Date,
  
  status: {
    type: String,
    enum: ['active', 'inactive', 'expired'],
    default: 'active'
  },
  
  // Metadata
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Index for quick lookup
idCardSchema.index({ cardNumber: 1 });
idCardSchema.index({ roleType: 1, client: 1 });
idCardSchema.index({ staffId: 1, roleType: 1 });
idCardSchema.index({ teacherId: 1, roleType: 1 });
idCardSchema.index({ studentId: 1, roleType: 1 });

module.exports = mongoose.model('IDCard', idCardSchema);
