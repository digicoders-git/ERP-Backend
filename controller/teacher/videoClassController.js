const VideoClass = require('../../model/VideoClass');
const Admin = require('../../model/Admin');

// Upload Video Class
exports.uploadVideoClass = async (req, res) => {
  try {
    const { title, subject, duration, thumbnailUrl, videoUrl } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId).lean();
    if (!admin || admin.role !== 'teacherAdmin') {
      return res.status(403).json({ message: 'Only teacher admin can upload video classes' });
    }

    const videoClass = new VideoClass({
      title,
      subject,
      duration,
      thumbnailUrl,
      videoUrl,
      branch: admin.branch,
      client: admin.client,
      createdBy: adminId
    });

    await videoClass.save();
    res.status(201).json({ message: 'Video class uploaded successfully', videoClass });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Video Classes
exports.getAllVideoClasses = async (req, res) => {
  try {
    const { page = 1, limit = 10, subject } = req.query;
    const skip = (page - 1) * limit;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId).lean();
    if (!admin || admin.role !== 'teacherAdmin') {
      return res.status(403).json({ message: 'Only teacher admin can view video classes' });
    }

    const searchQuery = { branch: admin.branch };
    if (subject) searchQuery.subject = { $regex: subject, $options: 'i' };

    const videoClasses = await VideoClass.find(searchQuery)
      .populate('createdBy', 'email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await VideoClass.countDocuments(searchQuery);

    res.status(200).json({
      videoClasses,
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

// Get Video Class By ID
exports.getVideoClassById = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId).lean();
    if (!admin || admin.role !== 'teacherAdmin') {
      return res.status(403).json({ message: 'Only teacher admin can view video class details' });
    }

    const videoClass = await VideoClass.findById(id)
      .populate('branch', 'branchName branchCode')
      .populate('createdBy', 'email role');

    if (!videoClass) {
      return res.status(404).json({ message: 'Video class not found' });
    }

    if (videoClass.branch._id.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.status(200).json({ videoClass });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Video Class
exports.updateVideoClass = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, subject, duration, thumbnailUrl, videoUrl } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId).lean();
    if (!admin || admin.role !== 'teacherAdmin') {
      return res.status(403).json({ message: 'Only teacher admin can update video classes' });
    }

    const videoClass = await VideoClass.findById(id);
    if (!videoClass) {
      return res.status(404).json({ message: 'Video class not found' });
    }

    if (videoClass.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (title) videoClass.title = title;
    if (subject) videoClass.subject = subject;
    if (duration) videoClass.duration = duration;
    if (thumbnailUrl) videoClass.thumbnailUrl = thumbnailUrl;
    if (videoUrl) videoClass.videoUrl = videoUrl;

    await videoClass.save();
    res.status(200).json({ message: 'Video class updated successfully', videoClass });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete Video Class
exports.deleteVideoClass = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId).lean();
    if (!admin || admin.role !== 'teacherAdmin') {
      return res.status(403).json({ message: 'Only teacher admin can delete video classes' });
    }

    const videoClass = await VideoClass.findById(id);
    if (!videoClass) {
      return res.status(404).json({ message: 'Video class not found' });
    }

    if (videoClass.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await VideoClass.findByIdAndDelete(id);
    res.status(200).json({ message: 'Video class deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
