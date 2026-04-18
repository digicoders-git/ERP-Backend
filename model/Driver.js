const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const driverSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  mobileNo: {
    type: String,
    required: true,
    trim: true
  },
  password: {
    type: String,
    default: null,
    select: false
  },
  licenseNo: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  licenseExpiryDate: {
    type: Date,
    required: true
  },
  experience: {
    type: Number,
    required: true,
    min: 0
  },
  address: {
    type: String,
    default: null
  },
  status: {
    type: Boolean,
    default: true
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
  profilePic: {
    type: String,
    default: null
  },
  salary: {
    type: Number,
    min: 0,
    default: 0
  }
}, { timestamps: true });

// Hash password before saving
driverSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    if (this.password) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
driverSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Driver', driverSchema);
