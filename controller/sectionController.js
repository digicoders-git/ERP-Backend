const Section = require('../model/Section');
const Class = require('../model/Class');
const Admin = require('../model/Admin');

// Create Section
exports.createSection = async (req, res) => {
  try {
    const { sectionName, assignToClass, capacity, description } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || admin.role !== 'branchAdmin') {
      return res.status(403).json({ message: 'Only branch admin can create sections' });
    }

    const classData = await Class.findById(assignToClass);
    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }

    if (classData.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Class does not belong to your branch' });
    }

    const newSection = new Section({
      sectionName,
      assignToClass,
      capacity,
      description,
      branch: admin.branch,
      client: admin.client,
      createdBy: adminId
    });

    await newSection.save();
    res.status(201).json({ message: 'Section created successfully', section: newSection });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Sections
exports.getAllSections = async (req, res) => {
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
        { sectionName: { $regex: search, $options: 'i' } }
      ]
    } : {};

    let sections, total;
    if (admin.role === 'branchAdmin') {
      searchQuery.branch = admin.branch;
      sections = await Section.find(searchQuery)
        .populate('assignToClass', 'className classCode')
        .populate('branch', 'branchName branchCode')
        .populate('createdBy', 'email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      total = await Section.countDocuments(searchQuery);
    } else if (admin.role === 'clientAdmin') {
      searchQuery.client = admin.client;
      sections = await Section.find(searchQuery)
        .populate('assignToClass', 'className classCode')
        .populate('branch', 'branchName branchCode')
        .populate('createdBy', 'email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      total = await Section.countDocuments(searchQuery);
    } else {
      sections = await Section.find(searchQuery)
        .populate('assignToClass', 'className classCode')
        .populate('branch', 'branchName branchCode')
        .populate('client', 'name')
        .populate('createdBy', 'email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      total = await Section.countDocuments(searchQuery);
    }

    res.status(200).json({ 
      sections, 
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

// Get Section By ID
exports.getSectionById = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const section = await Section.findById(id)
      .populate('assignToClass', 'className classCode classCapacity')
      .populate('branch', 'branchName branchCode')
      .populate('client', 'name')
      .populate('createdBy', 'email role');

    if (!section) {
      return res.status(404).json({ message: 'Section not found' });
    }

    if (admin.role === 'branchAdmin' && section.branch._id.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (admin.role === 'clientAdmin' && section.client._id.toString() !== admin.client.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.status(200).json({ section });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Section
exports.updateSection = async (req, res) => {
  try {
    const { id } = req.params;
    const { sectionName, assignToClass, capacity, description } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || admin.role !== 'branchAdmin') {
      return res.status(403).json({ message: 'Only branch admin can update sections' });
    }

    const section = await Section.findById(id);
    if (!section) {
      return res.status(404).json({ message: 'Section not found' });
    }

    if (section.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (assignToClass && assignToClass !== section.assignToClass.toString()) {
      const classData = await Class.findById(assignToClass);
      if (!classData) {
        return res.status(404).json({ message: 'Class not found' });
      }
      if (classData.branch.toString() !== admin.branch.toString()) {
        return res.status(403).json({ message: 'Class does not belong to your branch' });
      }
      section.assignToClass = assignToClass;
    }

    if (sectionName) section.sectionName = sectionName;
    if (capacity) section.capacity = capacity;
    if (description !== undefined) section.description = description;

    await section.save();
    res.status(200).json({ message: 'Section updated successfully', section });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete Section
exports.deleteSection = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || admin.role !== 'branchAdmin') {
      return res.status(403).json({ message: 'Only branch admin can delete sections' });
    }

    const section = await Section.findById(id);
    if (!section) {
      return res.status(404).json({ message: 'Section not found' });
    }

    if (section.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Section.findByIdAndDelete(id);
    res.status(200).json({ message: 'Section deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
