const Class = require('../model/Class');
const Admin = require('../model/Admin');

// Create Class
exports.createClass = async (req, res) => {
  try {
    const { className, classCode, classCapacity, description } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || admin.role !== 'branchAdmin') {
      return res.status(403).json({ message: 'Only branch admin can create classes' });
    }

    const existingClass = await Class.findOne({ classCode: classCode.toUpperCase() });
    if (existingClass) {
      return res.status(400).json({ message: 'Class code already exists' });
    }

    const newClass = new Class({
      className,
      classCode: classCode.toUpperCase(),
      classCapacity,
      description,
      branch: admin.branch,
      client: admin.client,
      createdBy: adminId
    });

    await newClass.save();
    res.status(201).json({ message: 'Class created successfully', class: newClass });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Classes
exports.getAllClasses = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const skip = (page - 1) * limit;
    const adminId = req.userId;
    const admin = await Admin.findById(adminId);

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const searchQuery = search ? {
      $or: [
        { className: { $regex: search, $options: 'i' } },
        { classCode: { $regex: search, $options: 'i' } }
      ]
    } : {};

    let classes, total;
    if (admin.role === 'branchAdmin') {
      searchQuery.branch = admin.branch;
      classes = await Class.find(searchQuery)
        .populate('branch', 'branchName branchCode')
        .populate('createdBy', 'email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      total = await Class.countDocuments(searchQuery);
    } else if (admin.role === 'clientAdmin') {
      searchQuery.client = admin.client;
      classes = await Class.find(searchQuery)
        .populate('branch', 'branchName branchCode')
        .populate('createdBy', 'email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      total = await Class.countDocuments(searchQuery);
    } else {
      classes = await Class.find(searchQuery)
        .populate('branch', 'branchName branchCode')
        .populate('client', 'name')
        .populate('createdBy', 'email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      total = await Class.countDocuments(searchQuery);
    }

    res.status(200).json({ 
      classes, 
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

// Get Class By ID
exports.getClassById = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const classData = await Class.findById(id)
      .populate('branch', 'branchName branchCode')
      .populate('client', 'name')
      .populate('createdBy', 'email role');

    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }

    if (admin.role === 'branchAdmin' && classData.branch._id.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (admin.role === 'clientAdmin' && classData.client._id.toString() !== admin.client.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.status(200).json({ class: classData });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Class
exports.updateClass = async (req, res) => {
  try {
    const { id } = req.params;
    const { className, classCode, classCapacity, description } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || admin.role !== 'branchAdmin') {
      return res.status(403).json({ message: 'Only branch admin can update classes' });
    }

    const classData = await Class.findById(id);
    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }

    if (classData.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (classCode && classCode.toUpperCase() !== classData.classCode) {
      const existingClass = await Class.findOne({ classCode: classCode.toUpperCase() });
      if (existingClass) {
        return res.status(400).json({ message: 'Class code already exists' });
      }
    }

    if (className) classData.className = className;
    if (classCode) classData.classCode = classCode.toUpperCase();
    if (classCapacity) classData.classCapacity = classCapacity;
    if (description !== undefined) classData.description = description;

    await classData.save();
    res.status(200).json({ message: 'Class updated successfully', class: classData });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete Class
exports.deleteClass = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || admin.role !== 'branchAdmin') {
      return res.status(403).json({ message: 'Only branch admin can delete classes' });
    }

    const classData = await Class.findById(id);
    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }

    if (classData.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Class.findByIdAndDelete(id);
    res.status(200).json({ message: 'Class deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
