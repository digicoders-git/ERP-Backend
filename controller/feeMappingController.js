const FeeMapping = require('../model/FeeMapping');
const Class = require('../model/Class');
const Section = require('../model/Section');
const Fee = require('../model/Fee');
const Admin = require('../model/Admin');

// Map Fee to Class and Section
exports.mapFee = async (req, res) => {
  try {
    const { classId, sectionId, feeId } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || admin.role !== 'branchAdmin') {
      return res.status(403).json({ message: 'Only branch admin can map fees' });
    }

    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }

    if (classData.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Class does not belong to your branch' });
    }

    const section = await Section.findById(sectionId);
    if (!section) {
      return res.status(404).json({ message: 'Section not found' });
    }

    if (section.assignToClass.toString() !== classId) {
      return res.status(400).json({ message: 'Section does not belong to the selected class' });
    }

    if (section.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Section does not belong to your branch' });
    }

    const fee = await Fee.findById(feeId);
    if (!fee) {
      return res.status(404).json({ message: 'Fee not found' });
    }

    if (fee.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Fee does not belong to your branch' });
    }

    const existingMapping = await FeeMapping.findOne({
      class: classId,
      section: sectionId,
      fee: feeId
    });

    if (existingMapping) {
      return res.status(400).json({ message: 'Fee already mapped to this class and section' });
    }

    const newMapping = new FeeMapping({
      class: classId,
      section: sectionId,
      fee: feeId,
      branch: admin.branch,
      client: admin.client,
      createdBy: adminId
    });

    await newMapping.save();
    res.status(201).json({ message: 'Fee mapped successfully', mapping: newMapping });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Fee Mappings
exports.getAllMappings = async (req, res) => {
  try {
    const adminId = req.userId;
    const admin = await Admin.findById(adminId);

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    let mappings;
    if (admin.role === 'branchAdmin') {
      mappings = await FeeMapping.find({ branch: admin.branch })
        .populate('class', 'className classCode')
        .populate('section', 'sectionName')
        .populate('fee', 'feeName feeType totalAmount')
        .populate('branch', 'branchName branchCode')
        .populate('createdBy', 'email role');
    } else if (admin.role === 'clientAdmin') {
      mappings = await FeeMapping.find({ client: admin.client })
        .populate('class', 'className classCode')
        .populate('section', 'sectionName')
        .populate('fee', 'feeName feeType totalAmount')
        .populate('branch', 'branchName branchCode')
        .populate('createdBy', 'email role');
    } else {
      mappings = await FeeMapping.find()
        .populate('class', 'className classCode')
        .populate('section', 'sectionName')
        .populate('fee', 'feeName feeType totalAmount')
        .populate('branch', 'branchName branchCode')
        .populate('client', 'name')
        .populate('createdBy', 'email role');
    }

    res.status(200).json({ mappings });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete Fee Mapping
exports.deleteFeeMapping = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || admin.role !== 'branchAdmin') {
      return res.status(403).json({ message: 'Only branch admin can delete fee mappings' });
    }

    const mapping = await FeeMapping.findById(id);
    if (!mapping) {
      return res.status(404).json({ message: 'Fee mapping not found' });
    }

    if (mapping.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await FeeMapping.findByIdAndDelete(id);
    res.status(200).json({ message: 'Fee mapping deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
