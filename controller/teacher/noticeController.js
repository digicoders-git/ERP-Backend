const Notice = require('../../model/Notice');
const Admin = require('../../model/Admin');

// Create Notice
exports.createNotice = async (req, res) => {
  try {
    const { title, type, class: className, priority, publishDate, expiryDate, content } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId).lean();
    if (!admin || admin.role !== 'teacherAdmin') {
      return res.status(403).json({ message: 'Only teacher admin can create notices' });
    }

    const attachments = req.files ? req.files.map(file => file.path) : [];

    const notice = new Notice({
      title,
      type,
      class: className,
      priority,
      publishDate,
      expiryDate,
      content,
      attachments,
      isPublished: false,
      branch: admin.branch,
      client: admin.client,
      createdBy: adminId
    });

    await notice.save();
    res.status(201).json({ message: 'Notice created successfully', notice });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Publish Notice
exports.publishNotice = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId).lean();
    if (!admin || admin.role !== 'teacherAdmin') {
      return res.status(403).json({ message: 'Only teacher admin can publish notices' });
    }

    const notice = await Notice.findById(id);
    if (!notice) {
      return res.status(404).json({ message: 'Notice not found' });
    }

    if (notice.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    notice.isPublished = true;
    await notice.save();

    res.status(200).json({ message: 'Notice published successfully', notice });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Unpublish Notice
exports.unpublishNotice = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId).lean();
    if (!admin || admin.role !== 'teacherAdmin') {
      return res.status(403).json({ message: 'Only teacher admin can unpublish notices' });
    }

    const notice = await Notice.findById(id);
    if (!notice) {
      return res.status(404).json({ message: 'Notice not found' });
    }

    if (notice.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    notice.isPublished = false;
    await notice.save();

    res.status(200).json({ message: 'Notice unpublished successfully', notice });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Notices
exports.getAllNotices = async (req, res) => {
  try {
    const { page = 1, limit = 10, type, priority, isPublished } = req.query;
    const skip = (page - 1) * limit;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId).lean();
    if (!admin || admin.role !== 'teacherAdmin') {
      return res.status(403).json({ message: 'Only teacher admin can view notices' });
    }

    const searchQuery = { branch: admin.branch, createdBy: adminId };
    if (type) searchQuery.type = type;
    if (priority) searchQuery.priority = priority;
    if (isPublished !== undefined) searchQuery.isPublished = isPublished === 'true';

    const notices = await Notice.find(searchQuery)
      .populate('createdBy', 'email role')
      .sort({ publishDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Notice.countDocuments(searchQuery);

    res.status(200).json({
      notices,
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

// Get Notice By ID
exports.getNoticeById = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId).lean();
    if (!admin || admin.role !== 'teacherAdmin') {
      return res.status(403).json({ message: 'Only teacher admin can view notice details' });
    }

    const notice = await Notice.findById(id)
      .populate('branch', 'branchName branchCode')
      .populate('createdBy', 'email role');

    if (!notice) {
      return res.status(404).json({ message: 'Notice not found' });
    }

    if (notice.branch._id.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.status(200).json({ notice });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Notice
exports.updateNotice = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, type, class: className, priority, publishDate, expiryDate, content } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId).lean();
    if (!admin || admin.role !== 'teacherAdmin') {
      return res.status(403).json({ message: 'Only teacher admin can update notices' });
    }

    const notice = await Notice.findById(id);
    if (!notice) {
      return res.status(404).json({ message: 'Notice not found' });
    }

    if (notice.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (title) notice.title = title;
    if (type) notice.type = type;
    if (className) notice.class = className;
    if (priority) notice.priority = priority;
    if (publishDate) notice.publishDate = publishDate;
    if (expiryDate) notice.expiryDate = expiryDate;
    if (content) notice.content = content;
    if (req.files && req.files.length > 0) {
      notice.attachments = [...notice.attachments, ...req.files.map(file => file.path)];
    }

    await notice.save();
    res.status(200).json({ message: 'Notice updated successfully', notice });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete Notice
exports.deleteNotice = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId).lean();
    if (!admin || admin.role !== 'teacherAdmin') {
      return res.status(403).json({ message: 'Only teacher admin can delete notices' });
    }

    const notice = await Notice.findById(id);
    if (!notice) {
      return res.status(404).json({ message: 'Notice not found' });
    }

    if (notice.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Notice.findByIdAndDelete(id);
    res.status(200).json({ message: 'Notice deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
