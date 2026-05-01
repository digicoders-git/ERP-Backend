const mongoose = require('mongoose');
const AttendanceSetting = require('../../model/AttendanceSetting');

exports.getSettings = async (req, res) => {
  try {
    const rawBranchId = req.user.branch?._id || req.user.branch;
    if (!rawBranchId) return res.status(400).json({ success: false, message: 'Branch ID not found in token' });
    
    const branchId = new mongoose.Types.ObjectId(rawBranchId);
    let settings = await AttendanceSetting.findOne({ branch: branchId });
    
    if (!settings) {
      // Create default settings if not exists
      settings = await AttendanceSetting.create({ branch: branchId });
    }
    
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const rawBranchId = req.user.branch?._id || req.user.branch;
    if (!rawBranchId) return res.status(400).json({ success: false, message: 'Branch ID not found in token' });

    const branchId = new mongoose.Types.ObjectId(rawBranchId);
    const updateData = req.body;
    updateData.updatedBy = req.userId;

    const settings = await AttendanceSetting.findOneAndUpdate(
      { branch: branchId },
      { $set: updateData },
      { new: true, upsert: true }
    );

    res.status(200).json({ 
      success: true, 
      message: 'Attendance settings updated successfully', 
      data: settings 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
