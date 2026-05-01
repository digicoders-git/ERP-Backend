const mongoose = require('mongoose');

const attendanceSettingSchema = new mongoose.Schema({
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, unique: true },
  
  studentMode: { 
    type: String, 
    enum: ['manual', 'biometric', 'hybrid', 'app'], 
    default: 'manual' 
  },

  staffMode: { 
    type: String, 
    enum: ['manual', 'biometric', 'hybrid', 'app'], 
    default: 'manual' 
  },

  // 2. Device Mode
  // test: Simulation mode (API post /biometric/test-sync)
  // live: Real device integration
  deviceMode: { 
    type: String, 
    enum: ['test', 'live'], 
    default: 'test' 
  },

  // 3. Additional Settings
  allowTeacherOverride: { type: Boolean, default: false },
  autoMarkAbsent: { type: Boolean, default: false },
  
  // Time window for attendance
  startTime: { type: String, default: "08:00" }, // HH:mm
  endTime: { type: String, default: "10:00" },   // HH:mm

  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
}, { timestamps: true });

module.exports = mongoose.model('AttendanceSetting', attendanceSettingSchema);
