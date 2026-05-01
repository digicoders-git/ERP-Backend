const SubstituteTeacher = require('../../model/SubstituteTeacher');
const Admin = require('../../model/Admin');
const Teacher = require('../../model/Teacher');
const Class = require('../../model/Class');
const Section = require('../../model/Section');

exports.assignSubstitute = async (req, res) => {
  try {
    const { classId, sectionId, substituteTeacherId, startDate, endDate, reason } = req.body;
    const adminId = req.userId;

    if (!classId || !sectionId || !substituteTeacherId || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const admin = await Admin.findById(adminId).select('branch').lean();
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Admin not found' });
    }

    // Check for overlapping assignments for the same class/section
    const overlap = await SubstituteTeacher.findOne({
      branch: admin.branch,
      classId,
      sectionId,
      $or: [
        { startDate: { $lte: new Date(endDate) }, endDate: { $gte: new Date(startDate) } }
      ]
    });

    if (overlap) {
      return res.status(400).json({ 
        success: false, 
        message: 'A substitute is already assigned to this class for the selected date range.' 
      });
    }

    const substitute = new SubstituteTeacher({
      branch: admin.branch,
      classId,
      sectionId,
      substituteTeacherId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason,
      assignedBy: adminId
    });

    await substitute.save();

    res.status(201).json({ 
      success: true, 
      message: 'Substitute teacher assigned successfully',
      data: substitute 
    });
  } catch (error) {
    console.error('Assign substitute error:', error);
    res.status(500).json({ success: false, message: 'Failed to assign substitute', error: error.message });
  }
};

exports.getSubstituteHistory = async (req, res) => {
  try {
    const adminId = req.userId;
    const admin = await Admin.findById(adminId).select('branch').lean();
    
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Admin not found' });
    }

    const history = await SubstituteTeacher.find({ branch: admin.branch })
      .populate('classId', 'className')
      .populate('sectionId', 'sectionName')
      .populate('substituteTeacherId', 'name email')
      .populate('assignedBy', 'name')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, data: history });
  } catch (error) {
    console.error('Get substitute history error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch substitute history', error: error.message });
  }
};

exports.deleteSubstitute = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;
    const admin = await Admin.findById(adminId).select('branch').lean();

    const substitute = await SubstituteTeacher.findById(id);
    if (!substitute) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    if (substitute.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    await SubstituteTeacher.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'Assignment deleted successfully' });
  } catch (error) {
    console.error('Delete substitute error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete assignment', error: error.message });
  }
};
