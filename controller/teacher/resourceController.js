const Resource = require('../../model/Resource');
const Admin = require('../../model/Admin');

// Upload Resource
exports.uploadResource = async (req, res) => {
  try {
    const { title, subject } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId).lean();
    if (!admin || admin.role !== 'teacherAdmin') {
      return res.status(403).json({ message: 'Only teacher admin can upload resources' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a file' });
    }

    const fileSize = (req.file.size / (1024 * 1024)).toFixed(2) + ' MB';

    const resource = new Resource({
      title,
      subject,
      fileUrl: req.file.path,
      fileSize,
      branch: admin.branch,
      client: admin.client,
      createdBy: adminId
    });

    await resource.save();
    res.status(201).json({ message: 'Resource uploaded successfully', resource });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Resources
exports.getAllResources = async (req, res) => {
  try {
    const { page = 1, limit = 10, subject } = req.query;
    const skip = (page - 1) * limit;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId).lean();
    if (!admin || admin.role !== 'teacherAdmin') {
      return res.status(403).json({ message: 'Only teacher admin can view resources' });
    }

    const searchQuery = { branch: admin.branch };
    if (subject) searchQuery.subject = { $regex: subject, $options: 'i' };

    const resources = await Resource.find(searchQuery)
      .populate('createdBy', 'email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Resource.countDocuments(searchQuery);

    res.status(200).json({
      resources,
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

// Get Resource By ID
exports.getResourceById = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId).lean();
    if (!admin || admin.role !== 'teacherAdmin') {
      return res.status(403).json({ message: 'Only teacher admin can view resource details' });
    }

    const resource = await Resource.findById(id)
      .populate('branch', 'branchName branchCode')
      .populate('createdBy', 'email role');

    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    if (resource.branch._id.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.status(200).json({ resource });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Resource
exports.updateResource = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, subject } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId).lean();
    if (!admin || admin.role !== 'teacherAdmin') {
      return res.status(403).json({ message: 'Only teacher admin can update resources' });
    }

    const resource = await Resource.findById(id);
    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    if (resource.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (title) resource.title = title;
    if (subject) resource.subject = subject;
    if (req.file) {
      resource.fileUrl = req.file.path;
      resource.fileSize = (req.file.size / (1024 * 1024)).toFixed(2) + ' MB';
    }

    await resource.save();
    res.status(200).json({ message: 'Resource updated successfully', resource });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete Resource
exports.deleteResource = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId).lean();
    if (!admin || admin.role !== 'teacherAdmin') {
      return res.status(403).json({ message: 'Only teacher admin can delete resources' });
    }

    const resource = await Resource.findById(id);
    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    if (resource.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Resource.findByIdAndDelete(id);
    res.status(200).json({ message: 'Resource deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
