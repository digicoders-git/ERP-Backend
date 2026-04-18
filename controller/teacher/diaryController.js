const Diary = require('../../model/Diary');
const Teacher = require('../../model/Teacher');
const Admin = require('../../model/Admin');
const Class = require('../../model/Class');

// Get all diary entries for teacher
exports.getAllDiaryEntries = async (req, res) => {
  try {
    const { page = 1, limit = 10, type, priority, classId } = req.query;
    const skip = (page - 1) * limit;
    const adminId = req.userId;
    const branch = req.user?.branch;

    if (!adminId || !branch) {
      return res.status(400).json({ success: false, message: 'Missing user information' });
    }

    const query = { branch, createdBy: adminId };
    if (type) query.type = type;
    if (priority) query.priority = priority;
    if (classId) query.class = classId;

    const [entries, total] = await Promise.all([
      Diary.find(query)
        .populate('class', 'className classCode')
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Diary.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: entries,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get diary entries error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch diary entries', error: error.message });
  }
};

// Get single diary entry
exports.getDiaryEntryById = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;
    const branch = req.user?.branch;

    const entry = await Diary.findById(id)
      .populate('class', 'className classCode')
      .lean();

    if (!entry) {
      return res.status(404).json({ success: false, message: 'Diary entry not found' });
    }

    if (entry.branch.toString() !== branch.toString() || entry.createdBy.toString() !== adminId.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.status(200).json({ success: true, data: entry });
  } catch (error) {
    console.error('Get diary entry error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch diary entry', error: error.message });
  }
};

// Create diary entry
exports.createDiaryEntry = async (req, res) => {
  try {
    const { title, date, type, priority, classId, content } = req.body;
    const adminId = req.userId;
    const branch = req.user?.branch;

    if (!title || !date || !type || !priority || !classId || !content) {
      return res.status(400).json({ success: false, message: 'All required fields must be provided' });
    }

    const classData = await Class.findById(classId).lean();
    if (!classData) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    const admin = await Admin.findById(adminId).select('client').lean();
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    const entry = new Diary({
      title,
      date: new Date(date),
      type,
      priority,
      class: classId,
      content,
      image: req.file ? req.file.path : null,
      branch,
      client: admin.client,
      createdBy: adminId
    });

    await entry.save();
    await entry.populate('class', 'className classCode');

    res.status(201).json({ success: true, message: 'Diary entry created successfully', data: entry });
  } catch (error) {
    console.error('Create diary entry error:', error);
    res.status(500).json({ success: false, message: 'Failed to create diary entry', error: error.message });
  }
};

// Update diary entry
exports.updateDiaryEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, date, type, priority, classId, content } = req.body;
    const adminId = req.userId;
    const branch = req.user?.branch;

    const entry = await Diary.findById(id);
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Diary entry not found' });
    }

    if (entry.branch.toString() !== branch.toString() || entry.createdBy.toString() !== adminId.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (title) entry.title = title;
    if (date) entry.date = new Date(date);
    if (type) entry.type = type;
    if (priority) entry.priority = priority;
    if (classId) entry.class = classId;
    if (content) entry.content = content;
    if (req.file) entry.image = req.file.path;

    await entry.save();
    await entry.populate('class', 'className classCode');

    res.status(200).json({ success: true, message: 'Diary entry updated successfully', data: entry });
  } catch (error) {
    console.error('Update diary entry error:', error);
    res.status(500).json({ success: false, message: 'Failed to update diary entry', error: error.message });
  }
};

// Delete diary entry
exports.deleteDiaryEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;
    const branch = req.user?.branch;

    const entry = await Diary.findById(id);
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Diary entry not found' });
    }

    if (entry.branch.toString() !== branch.toString() || entry.createdBy.toString() !== adminId.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await Diary.findByIdAndDelete(id);

    res.status(200).json({ success: true, message: 'Diary entry deleted successfully' });
  } catch (error) {
    console.error('Delete diary entry error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete diary entry', error: error.message });
  }
};

// Get diary statistics
exports.getDiaryStats = async (req, res) => {
  try {
    const adminId = req.userId;
    const branch = req.user?.branch;

    const stats = await Diary.aggregate([
      { $match: { branch, createdBy: adminId } },
      {
        $facet: {
          total: [{ $count: 'count' }],
          byType: [{ $group: { _id: '$type', count: { $sum: 1 } } }],
          byPriority: [{ $group: { _id: '$priority', count: { $sum: 1 } } }]
        }
      }
    ]);

    const result = {
      total: stats[0]?.total[0]?.count || 0,
      byType: stats[0]?.byType || [],
      byPriority: stats[0]?.byPriority || []
    };

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Get diary stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch diary statistics', error: error.message });
  }
};
