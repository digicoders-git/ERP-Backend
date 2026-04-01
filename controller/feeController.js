const Fee = require('../model/Fee');
const Admin = require('../model/Admin');
const Staff = require('../model/Staff');
const Teacher = require('../model/Teacher');
const Class = require('../model/Class');
const Section = require('../model/Section');
const FeeMapping = require('../model/FeeMapping');

// Create Fee
exports.createFee = async (req, res) => {
  try {
    const { feeName, feeType, frequency, totalAmount } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || admin.role !== 'branchAdmin') {
      return res.status(403).json({ message: 'Only branch admin can create fees' });
    }

    if (feeType === 'recurring' && !frequency) {
      return res.status(400).json({ message: 'Frequency is required for recurring fee type' });
    }

    if (feeType === 'fixed' && frequency) {
      return res.status(400).json({ message: 'Frequency should not be provided for fixed fee type' });
    }

    const newFee = new Fee({
      feeName,
      feeType,
      frequency: feeType === 'recurring' ? frequency : undefined,
      totalAmount,
      branch: admin.branch,
      client: admin.client,
      createdBy: adminId
    });

    await newFee.save();
    res.status(201).json({ message: 'Fee created successfully', fee: newFee });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Fees
exports.getAllFees = async (req, res) => {
  try {
    const adminId = req.userId;
    const admin = await Admin.findById(adminId);

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    let fees;
    if (admin.role === 'branchAdmin') {
      fees = await Fee.find({ branch: admin.branch })
        .populate('branch', 'branchName branchCode')
        .populate('createdBy', 'email role');
    } else if (admin.role === 'clientAdmin') {
      fees = await Fee.find({ client: admin.client })
        .populate('branch', 'branchName branchCode')
        .populate('createdBy', 'email role');
    } else {
      fees = await Fee.find()
        .populate('branch', 'branchName branchCode')
        .populate('client', 'name')
        .populate('createdBy', 'email role');
    }

    res.status(200).json({ fees });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Fee By ID
exports.getFeeById = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const fee = await Fee.findById(id)
      .populate('branch', 'branchName branchCode')
      .populate('client', 'name')
      .populate('createdBy', 'email role');

    if (!fee) {
      return res.status(404).json({ message: 'Fee not found' });
    }

    if (admin.role === 'branchAdmin' && fee.branch._id.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (admin.role === 'clientAdmin' && fee.client._id.toString() !== admin.client.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.status(200).json({ fee });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Fee
exports.updateFee = async (req, res) => {
  try {
    const { id } = req.params;
    const { feeName, feeType, frequency, totalAmount } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || admin.role !== 'branchAdmin') {
      return res.status(403).json({ message: 'Only branch admin can update fees' });
    }

    const fee = await Fee.findById(id);
    if (!fee) {
      return res.status(404).json({ message: 'Fee not found' });
    }

    if (fee.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (feeType) {
      if (feeType === 'recurring' && !frequency) {
        return res.status(400).json({ message: 'Frequency is required for recurring fee type' });
      }
      if (feeType === 'fixed') {
        fee.frequency = undefined;
      }
      fee.feeType = feeType;
    }

    if (frequency) {
      if (fee.feeType === 'fixed') {
        return res.status(400).json({ message: 'Frequency should not be provided for fixed fee type' });
      }
      fee.frequency = frequency;
    }

    if (feeName) fee.feeName = feeName;
    if (totalAmount !== undefined) fee.totalAmount = totalAmount;

    await fee.save();
    res.status(200).json({ message: 'Fee updated successfully', fee });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete Fee
exports.deleteFee = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || admin.role !== 'branchAdmin') {
      return res.status(403).json({ message: 'Only branch admin can delete fees' });
    }

    const fee = await Fee.findById(id);
    if (!fee) {
      return res.status(404).json({ message: 'Fee not found' });
    }

    if (fee.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Fee.findByIdAndDelete(id);
    res.status(200).json({ message: 'Fee deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// BranchAdmin Dashboard Stats
exports.getBranchDashboardStats = async (req, res) => {
  try {
    const admin = await Admin.findById(req.userId);
    if (!admin || admin.role !== 'branchAdmin') {
      return res.status(403).json({ message: 'Only branch admin can access this' });
    }

    const branchId = admin.branch;

    const [totalStaff, totalTeachers, totalClasses, totalSections, totalFees, activeFees] = await Promise.all([
      Staff.countDocuments({ branch: branchId }),
      Teacher.countDocuments({ branch: branchId }),
      Class.countDocuments({ branch: branchId }),
      Section.countDocuments({ branch: branchId }),
      Fee.countDocuments({ branch: branchId }),
      Fee.countDocuments({ branch: branchId, status: true })
    ]);

    const recentStaff = await Staff.find({ branch: branchId }).sort({ createdAt: -1 }).limit(5).select('name email mobile status createdAt');
    const recentTeachers = await Teacher.find({ branch: branchId }).sort({ createdAt: -1 }).limit(5).select('name email mobile subjects status createdAt');

    res.status(200).json({
      stats: { totalStaff, totalTeachers, totalClasses, totalSections, totalFees, activeFees },
      recentStaff,
      recentTeachers
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Toggle Fee Status
exports.toggleFeeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || admin.role !== 'branchAdmin') {
      return res.status(403).json({ message: 'Only branch admin can toggle fee status' });
    }

    const fee = await Fee.findById(id);
    if (!fee) {
      return res.status(404).json({ message: 'Fee not found' });
    }

    if (fee.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    fee.status = !fee.status;
    await fee.save();

    res.status(200).json({ message: `Fee status changed to ${fee.status}`, fee });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
