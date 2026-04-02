const mongoose = require('mongoose');

const driverSalarySchema = new mongoose.Schema({
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
  driverName: { type: String, required: true },
  month: { type: String, required: true },
  baseSalary: { type: Number, required: true, min: 0 },
  allowances: { type: Number, default: 0 },
  deductions: { type: Number, default: 0 },
  netSalary: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['Pending', 'Paid'], default: 'Pending' },
  paymentDate: { type: Date },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
}, { timestamps: true });

driverSalarySchema.index({ driver: 1, month: 1 }, { unique: true });
driverSalarySchema.index({ branch: 1, month: 1 });
driverSalarySchema.index({ status: 1 });

module.exports = mongoose.model('DriverSalary', driverSalarySchema);
