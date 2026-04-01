const FeeStructure = require('../../model/FeeStructure');
const Class = require('../../model/Class');
const Admin = require('../../model/Admin');

// Create Fee Structure
exports.createFeeStructure = async (req, res) => {
  try {
    const { classId, tuitionFee, examFee, libraryFee, sportsFee, labFee } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(403).json({ message: 'Admin not found' });
    }

    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }

    if (classData.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Class does not belong to your branch' });
    }

    // Check if fee structure already exists for this class
    const existingFeeStructure = await FeeStructure.findOne({ class: classId });
    if (existingFeeStructure) {
      return res.status(400).json({ message: 'Fee structure already exists for this class' });
    }

    const newFeeStructure = new FeeStructure({
      class: classId,
      tuitionFee: tuitionFee || 0,
      examFee: examFee || 0,
      libraryFee: libraryFee || 0,
      sportsFee: sportsFee || 0,
      labFee: labFee || 0,
      branch: admin.branch,
      client: admin.client,
      createdBy: adminId
    });

    await newFeeStructure.save();
    res.status(201).json({ message: 'Fee structure created successfully', feeStructure: newFeeStructure });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Fee Structures
exports.getAllFeeStructures = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const skip = (page - 1) * limit;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(403).json({ message: 'Admin not found' });
    }

    const searchQuery = { branch: admin.branch };

    const feeStructures = await FeeStructure.find(searchQuery)
      .populate('class', 'className classCode')
      .populate('createdBy', 'email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await FeeStructure.countDocuments(searchQuery);

    res.status(200).json({
      feeStructures,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Fee Structure By ID
exports.getFeeStructureById = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(403).json({ message: 'Admin not found' });
    }

    const feeStructure = await FeeStructure.findById(id)
      .populate('class', 'className classCode classCapacity')
      .populate('branch', 'branchName branchCode')
      .populate('createdBy', 'email role');

    if (!feeStructure) {
      return res.status(404).json({ message: 'Fee structure not found' });
    }

    if (feeStructure.branch._id.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.status(200).json({ feeStructure });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Fee Structure By Class
exports.getFeeStructureByClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(403).json({ message: 'Admin not found' });
    }

    const feeStructure = await FeeStructure.findOne({ class: classId })
      .populate('class', 'className classCode classCapacity')
      .populate('branch', 'branchName branchCode')
      .populate('createdBy', 'email role');

    if (!feeStructure) {
      return res.status(404).json({ message: 'Fee structure not found for this class' });
    }

    if (feeStructure.branch._id.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.status(200).json({ feeStructure });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Fee Structure
exports.updateFeeStructure = async (req, res) => {
  try {
    const { id } = req.params;
    const { tuitionFee, examFee, libraryFee, sportsFee, labFee } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(403).json({ message: 'Admin not found' });
    }

    const feeStructure = await FeeStructure.findById(id);
    if (!feeStructure) {
      return res.status(404).json({ message: 'Fee structure not found' });
    }

    if (feeStructure.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (tuitionFee !== undefined) feeStructure.tuitionFee = tuitionFee;
    if (examFee !== undefined) feeStructure.examFee = examFee;
    if (libraryFee !== undefined) feeStructure.libraryFee = libraryFee;
    if (sportsFee !== undefined) feeStructure.sportsFee = sportsFee;
    if (labFee !== undefined) feeStructure.labFee = labFee;

    await feeStructure.save();
    res.status(200).json({ message: 'Fee structure updated successfully', feeStructure });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete Fee Structure
exports.deleteFeeStructure = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(403).json({ message: 'Admin not found' });
    }

    const feeStructure = await FeeStructure.findById(id);
    if (!feeStructure) {
      return res.status(404).json({ message: 'Fee structure not found' });
    }

    if (feeStructure.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await FeeStructure.findByIdAndDelete(id);
    res.status(200).json({ message: 'Fee structure deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
