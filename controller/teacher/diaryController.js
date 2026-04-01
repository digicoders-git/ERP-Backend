const Diary = require('../../model/Diary');
const Class = require('../../model/Class');
const Admin = require('../../model/Admin');

// Add Diary Entry
exports.addDiaryEntry = async (req, res) => {
  try {
    const { title, date, type, priority, classId, content } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId).lean();
    if (!admin || admin.role !== 'teacherAdmin') {
      return res.status(403).json({ message: 'Only teacher admin can add diary entries' });
    }

    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }

    const diary = new Diary({
      title,
      date,
      type,
      priority,
      class: classId,
      content,
      image: req.file ? req.file.path : null,
      branch: admin.branch,
      client: admin.client,
      createdBy: adminId
    });

    await diary.save();
    res.status(201).json({ message: 'Diary entry added successfully', diary });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Diary Entries
exports.getAllDiaryEntries = async (req, res) => {
  try {
    const { page = 1, limit = 10, type, priority, classId } = req.query;
    const skip = (page - 1) * limit;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId).lean();
    if (!admin || admin.role !== 'teacherAdmin') {
      return res.status(403).json({ message: 'Only teacher admin can view diary entries' });
    }

    const searchQuery = { branch: admin.branch };
    if (type) searchQuery.type = type;
    if (priority) searchQuery.priority = priority;
    if (classId) searchQuery.class = classId;

    const diaries = await Diary.find(searchQuery)
      .populate('class', 'className classCode')
      .populate('createdBy', 'email role')
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Diary.countDocuments(searchQuery);

    res.status(200).json({
      diaries,
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

// Get Diary Entry By ID
exports.getDiaryEntryById = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId).lean();
    if (!admin || admin.role !== 'teacherAdmin') {
      return res.status(403).json({ message: 'Only teacher admin can view diary entry' });
    }

    const diary = await Diary.findById(id)
      .populate('class', 'className classCode')
      .populate('branch', 'branchName branchCode')
      .populate('createdBy', 'email role');

    if (!diary) {
      return res.status(404).json({ message: 'Diary entry not found' });
    }

    if (diary.branch._id.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.status(200).json({ diary });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Diary Entry
exports.updateDiaryEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, date, type, priority, content } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId).lean();
    if (!admin || admin.role !== 'teacherAdmin') {
      return res.status(403).json({ message: 'Only teacher admin can update diary entries' });
    }

    const diary = await Diary.findById(id);
    if (!diary) {
      return res.status(404).json({ message: 'Diary entry not found' });
    }

    if (diary.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (title) diary.title = title;
    if (date) diary.date = date;
    if (type) diary.type = type;
    if (priority) diary.priority = priority;
    if (content) diary.content = content;
    if (req.file) diary.image = req.file.path;

    await diary.save();
    res.status(200).json({ message: 'Diary entry updated successfully', diary });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete Diary Entry
exports.deleteDiaryEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId).lean();
    if (!admin || admin.role !== 'teacherAdmin') {
      return res.status(403).json({ message: 'Only teacher admin can delete diary entries' });
    }

    const diary = await Diary.findById(id);
    if (!diary) {
      return res.status(404).json({ message: 'Diary entry not found' });
    }

    if (diary.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Diary.findByIdAndDelete(id);
    res.status(200).json({ message: 'Diary entry deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
