const Notice = require('../../model/Notice');
const Staff = require('../../model/Staff');

// Create Notice
exports.createNotice = async (req, res) => {
  try {
    const { title, content, priority, type, class: className, publishDate, expiryDate, targetAudience } = req.body;
    const staffId = req.userId;

    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(403).json({ message: 'Staff not found' });
    }

    const attachments = req.files ? req.files.map(file => file.path) : [];
    
    let finalAudience = ['student'];
    if (targetAudience) {
      try {
        finalAudience = typeof targetAudience === 'string' ? JSON.parse(targetAudience) : targetAudience;
      } catch (e) {
        finalAudience = [targetAudience];
      }
    }

    const newNotice = new Notice({
      title,
      content,
      type,
      targetAudience: finalAudience,
      class: className,
      publishDate,
      expiryDate,
      attachments,
      priority: priority || 'normal',
      branch: staff.branch,
      client: staff.client,
      createdBy: staffId
    });

    await newNotice.save();
    res.status(201).json({ message: 'Notice created successfully', notice: newNotice });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Notices
exports.getAllNotices = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', priority = '' } = req.query;
    const skip = (page - 1) * limit;
    const staffId = req.userId;

    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(403).json({ message: 'Staff not found' });
    }

    const searchQuery = { branch: staff.branch };

    if (search) {
      searchQuery.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    if (priority && ['normal', 'medium', 'high'].includes(priority)) {
      searchQuery.priority = priority;
    }

    const notices = await Notice.find(searchQuery)
      .populate('createdBy', 'email')
      .sort({ createdAt: -1 })
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
    const staffId = req.userId;

    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(403).json({ message: 'Staff not found' });
    }

    const notice = await Notice.findById(id)
      .populate('branch', 'branchName branchCode')
      .populate('createdBy', 'email');

    if (!notice) {
      return res.status(404).json({ message: 'Notice not found' });
    }

    if (notice.branch._id.toString() !== staff.branch.toString()) {
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
    const { title, content, priority } = req.body;
    const staffId = req.userId;

    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(403).json({ message: 'Staff not found' });
    }

    const notice = await Notice.findById(id);
    if (!notice) {
      return res.status(404).json({ message: 'Notice not found' });
    }

    if (notice.branch.toString() !== staff.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (notice.createdBy.toString() !== staffId) {
      return res.status(403).json({ message: 'You can only update your own notices' });
    }

    if (title) notice.title = title;
    if (content) notice.content = content;
    if (priority) notice.priority = priority;

    if (req.files && req.files.length > 0) {
      const newAttachments = req.files.map(file => file.path);
      notice.attachments = [...(notice.attachments || []), ...newAttachments];
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
    const staffId = req.userId;

    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(403).json({ message: 'Staff not found' });
    }

    const notice = await Notice.findById(id);
    if (!notice) {
      return res.status(404).json({ message: 'Notice not found' });
    }

    if (notice.branch.toString() !== staff.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (notice.createdBy.toString() !== staffId) {
      return res.status(403).json({ message: 'You can only delete your own notices' });
    }

    await Notice.findByIdAndDelete(id);
    res.status(200).json({ message: 'Notice deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
