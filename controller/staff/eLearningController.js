const VideoClass = require('../../model/VideoClass');
const LiveClass = require('../../model/LiveClass');
const Resource = require('../../model/Resource');
const Admin = require('../../model/Admin');

const getBranchClient = async (userId) => {
  const admin = await Admin.findById(userId).select('branch client').lean();
  return admin || null;
};

// ─── DASHBOARD ────────────────────────────────────────────

exports.getDashboard = async (req, res) => {
  try {
    const { branch } = await getBranchClient(req.userId);

    const now = new Date();

    const [
      totalVideos,
      totalLiveClasses,
      upcomingLiveClasses,
      totalResources,
      recentVideos,
      recentResources,
      recentLiveClasses
    ] = await Promise.all([
      VideoClass.countDocuments({ branch }),
      LiveClass.countDocuments({ branch }),
      LiveClass.countDocuments({ branch, date: { $gte: now } }),
      Resource.countDocuments({ branch }),
      VideoClass.find({ branch })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('title subject duration thumbnailUrl createdAt')
        .lean(),
      Resource.find({ branch })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('title subject fileSize createdAt')
        .lean(),
      LiveClass.find({ branch, date: { $gte: now } })
        .sort({ date: 1 })
        .limit(5)
        .select('title subject meetLink date')
        .lean()
    ]);

    res.status(200).json({
      stats: { totalVideos, totalLiveClasses, upcomingLiveClasses, totalResources },
      recentVideos,
      recentResources,
      upcomingLiveClassesList: recentLiveClasses
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── VIDEO CLASS ──────────────────────────────────────────

exports.createVideo = async (req, res) => {
  try {
    const { branch, client } = await getBranchClient(req.userId);
    const { title, subject, duration, thumbnailUrl, videoUrl } = req.body;

    if (!title || !subject || !duration || !videoUrl) {
      return res.status(400).json({ message: 'title, subject, duration, videoUrl are required' });
    }

    const video = await VideoClass.create({
      title, subject, duration,
      thumbnailUrl: thumbnailUrl || '',
      videoUrl,
      branch, client,
      createdBy: req.userId
    });

    res.status(201).json({ message: 'Video class created successfully', video });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getAllVideos = async (req, res) => {
  try {
    const { branch } = await getBranchClient(req.userId);
    const { page = 1, limit = 20, subject, search } = req.query;
    const skip = (page - 1) * limit;

    const query = { branch };
    if (subject) query.subject = { $regex: subject, $options: 'i' };
    if (search) query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { subject: { $regex: search, $options: 'i' } }
    ];

    const [videos, total] = await Promise.all([
      VideoClass.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      VideoClass.countDocuments(query)
    ]);

    res.status(200).json({
      videos,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getVideoById = async (req, res) => {
  try {
    const { branch } = await getBranchClient(req.userId);
    const video = await VideoClass.findOne({ _id: req.params.id, branch }).lean();
    if (!video) return res.status(404).json({ message: 'Video not found' });
    res.status(200).json({ video });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateVideo = async (req, res) => {
  try {
    const { branch } = await getBranchClient(req.userId);
    const { title, subject, duration, thumbnailUrl, videoUrl } = req.body;

    const video = await VideoClass.findOne({ _id: req.params.id, branch });
    if (!video) return res.status(404).json({ message: 'Video not found' });

    if (title) video.title = title;
    if (subject) video.subject = subject;
    if (duration) video.duration = duration;
    if (thumbnailUrl) video.thumbnailUrl = thumbnailUrl;
    if (videoUrl) video.videoUrl = videoUrl;

    await video.save();
    res.status(200).json({ message: 'Video updated successfully', video });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteVideo = async (req, res) => {
  try {
    const { branch } = await getBranchClient(req.userId);
    const video = await VideoClass.findOneAndDelete({ _id: req.params.id, branch });
    if (!video) return res.status(404).json({ message: 'Video not found' });
    res.status(200).json({ message: 'Video deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── LIVE CLASS ───────────────────────────────────────────

exports.createLiveClass = async (req, res) => {
  try {
    const { branch, client } = await getBranchClient(req.userId);
    const { title, subject, meetLink, date } = req.body;

    if (!title || !subject || !meetLink || !date) {
      return res.status(400).json({ message: 'title, subject, meetLink, date are required' });
    }

    const liveClass = await LiveClass.create({
      title, subject, meetLink,
      date: new Date(date),
      branch, client,
      createdBy: req.userId
    });

    res.status(201).json({ message: 'Live class scheduled successfully', liveClass });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getAllLiveClasses = async (req, res) => {
  try {
    const { branch } = await getBranchClient(req.userId);
    const { page = 1, limit = 20, subject, upcoming } = req.query;
    const skip = (page - 1) * limit;

    const query = { branch };
    if (subject) query.subject = { $regex: subject, $options: 'i' };
    if (upcoming === 'true') query.date = { $gte: new Date() };

    const [liveClasses, total] = await Promise.all([
      LiveClass.find(query)
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      LiveClass.countDocuments(query)
    ]);

    res.status(200).json({
      liveClasses,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getLiveClassById = async (req, res) => {
  try {
    const { branch } = await getBranchClient(req.userId);
    const liveClass = await LiveClass.findOne({ _id: req.params.id, branch }).lean();
    if (!liveClass) return res.status(404).json({ message: 'Live class not found' });
    res.status(200).json({ liveClass });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateLiveClass = async (req, res) => {
  try {
    const { branch } = await getBranchClient(req.userId);
    const { title, subject, meetLink, date } = req.body;

    const liveClass = await LiveClass.findOne({ _id: req.params.id, branch });
    if (!liveClass) return res.status(404).json({ message: 'Live class not found' });

    if (title) liveClass.title = title;
    if (subject) liveClass.subject = subject;
    if (meetLink) liveClass.meetLink = meetLink;
    if (date) liveClass.date = new Date(date);

    await liveClass.save();
    res.status(200).json({ message: 'Live class updated successfully', liveClass });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteLiveClass = async (req, res) => {
  try {
    const { branch } = await getBranchClient(req.userId);
    const liveClass = await LiveClass.findOneAndDelete({ _id: req.params.id, branch });
    if (!liveClass) return res.status(404).json({ message: 'Live class not found' });
    res.status(200).json({ message: 'Live class deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── RESOURCE ─────────────────────────────────────────────

exports.uploadResource = async (req, res) => {
  try {
    const { branch, client } = await getBranchClient(req.userId);
    const { title, subject } = req.body;

    if (!title || !subject) {
      return res.status(400).json({ message: 'title and subject are required' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'File is required' });
    }

    const fileSize = (req.file.size / (1024 * 1024)).toFixed(2) + ' MB';

    const resource = await Resource.create({
      title, subject,
      fileUrl: req.file.path,
      fileSize,
      branch, client,
      createdBy: req.userId
    });

    res.status(201).json({ message: 'Resource uploaded successfully', resource });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getAllResources = async (req, res) => {
  try {
    const { branch } = await getBranchClient(req.userId);
    const { page = 1, limit = 20, subject, search } = req.query;
    const skip = (page - 1) * limit;

    const query = { branch };
    if (subject) query.subject = { $regex: subject, $options: 'i' };
    if (search) query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { subject: { $regex: search, $options: 'i' } }
    ];

    const [resources, total] = await Promise.all([
      Resource.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Resource.countDocuments(query)
    ]);

    res.status(200).json({
      resources,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getResourceById = async (req, res) => {
  try {
    const { branch } = await getBranchClient(req.userId);
    const resource = await Resource.findOne({ _id: req.params.id, branch }).lean();
    if (!resource) return res.status(404).json({ message: 'Resource not found' });
    res.status(200).json({ resource });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateResource = async (req, res) => {
  try {
    const { branch } = await getBranchClient(req.userId);
    const { title, subject } = req.body;

    const resource = await Resource.findOne({ _id: req.params.id, branch });
    if (!resource) return res.status(404).json({ message: 'Resource not found' });

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

exports.deleteResource = async (req, res) => {
  try {
    const { branch } = await getBranchClient(req.userId);
    const resource = await Resource.findOneAndDelete({ _id: req.params.id, branch });
    if (!resource) return res.status(404).json({ message: 'Resource not found' });
    res.status(200).json({ message: 'Resource deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
