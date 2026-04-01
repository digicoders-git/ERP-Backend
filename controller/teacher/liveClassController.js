const LiveClass = require('../../model/LiveClass');
const Admin = require('../../model/Admin');

// Schedule Live Class
exports.scheduleLiveClass = async (req, res) => {
  try {
    const { title, subject, meetLink, date } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId).lean();
    if (!admin || admin.role !== 'teacherAdmin') {
      return res.status(403).json({ message: 'Only teacher admin can schedule live classes' });
    }

    const liveClass = new LiveClass({
      title,
      subject,
      meetLink,
      date,
      branch: admin.branch,
      client: admin.client,
      createdBy: adminId
    });

    await liveClass.save();
    res.status(201).json({ message: 'Live class scheduled successfully', liveClass });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Live Classes
exports.getAllLiveClasses = async (req, res) => {
  try {
    const { page = 1, limit = 10, subject } = req.query;
    const skip = (page - 1) * limit;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId).lean();
    if (!admin || admin.role !== 'teacherAdmin') {
      return res.status(403).json({ message: 'Only teacher admin can view live classes' });
    }

    const searchQuery = { branch: admin.branch };
    if (subject) searchQuery.subject = { $regex: subject, $options: 'i' };

    const liveClasses = await LiveClass.find(searchQuery)
      .populate('createdBy', 'email role')
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await LiveClass.countDocuments(searchQuery);

    res.status(200).json({
      liveClasses,
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

// Get Live Class By ID
exports.getLiveClassById = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId).lean();
    if (!admin || admin.role !== 'teacherAdmin') {
      return res.status(403).json({ message: 'Only teacher admin can view live class details' });
    }

    const liveClass = await LiveClass.findById(id)
      .populate('branch', 'branchName branchCode')
      .populate('createdBy', 'email role');

    if (!liveClass) {
      return res.status(404).json({ message: 'Live class not found' });
    }

    if (liveClass.branch._id.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.status(200).json({ liveClass });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Live Class
exports.updateLiveClass = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, subject, meetLink, date } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId).lean();
    if (!admin || admin.role !== 'teacherAdmin') {
      return res.status(403).json({ message: 'Only teacher admin can update live classes' });
    }

    const liveClass = await LiveClass.findById(id);
    if (!liveClass) {
      return res.status(404).json({ message: 'Live class not found' });
    }

    if (liveClass.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (title) liveClass.title = title;
    if (subject) liveClass.subject = subject;
    if (meetLink) liveClass.meetLink = meetLink;
    if (date) liveClass.date = date;

    await liveClass.save();
    res.status(200).json({ message: 'Live class updated successfully', liveClass });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete Live Class
exports.deleteLiveClass = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId).lean();
    if (!admin || admin.role !== 'teacherAdmin') {
      return res.status(403).json({ message: 'Only teacher admin can delete live classes' });
    }

    const liveClass = await LiveClass.findById(id);
    if (!liveClass) {
      return res.status(404).json({ message: 'Live class not found' });
    }

    if (liveClass.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await LiveClass.findByIdAndDelete(id);
    res.status(200).json({ message: 'Live class deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
