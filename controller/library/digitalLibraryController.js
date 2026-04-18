const DigitalLibrary = require('../../model/DigitalLibrary');
const Admin = require('../../model/Admin');
const fs = require('fs');
const path = require('path');

const getAdmin = async (adminId) => {
  const admin = await Admin.findById(adminId).lean();
  if (!admin || admin.role !== 'libraryAdmin') return null;
  return admin;
};

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

// Get all digital books
exports.getAll = async (req, res) => {
  try {
    const admin = await getAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Only library admin can access this' });

    const { subject, class: cls, stream, search } = req.query;
    const query = { branch: admin.branch };
    if (subject) query.subject = subject;
    if (cls) query.class = cls;
    if (stream) query.stream = stream;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } }
      ];
    }

    const books = await DigitalLibrary.find(query)
      .populate('class', 'className')
      .populate('branch', 'branchName')
      .select('-createdBy')
      .sort({ createdAt: -1 })
      .lean();

    // Stats
    const totalDownloads = books.reduce((sum, b) => sum + (b.downloads || 0), 0);

    res.status(200).json({
      success: true,
      data: books,
      stats: { total: books.length, totalDownloads }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Upload new digital book (with file)
exports.upload = async (req, res) => {
  try {
    const admin = await getAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Only library admin can access this' });

    const { title, subject, class: cls, stream, uploadDate } = req.body;
    if (!title || !subject || !cls) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'title, subject and class are required' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'File is required' });
    }

    const fileUrl = `/uploads/digital-library/${req.file.filename}`;
    const fileSize = formatFileSize(req.file.size);

    const bookData = {
      title, subject, class: cls,
      fileUrl,
      fileName: req.file.originalname,
      fileSize,
      uploadDate: uploadDate ? new Date(uploadDate) : new Date(),
      branch: admin.branch,
      client: admin.client,
      createdBy: req.userId
    };

    // Only add stream if it's provided and not empty
    if (stream && stream.trim()) {
      bookData.stream = stream;
    }

    const book = new DigitalLibrary(bookData);
    await book.save();
    await book.populate('class', 'className');
    res.status(201).json({ success: true, message: 'Digital book uploaded successfully', data: book });
  } catch (error) {
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update metadata (no file change)
exports.update = async (req, res) => {
  try {
    const admin = await getAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Only library admin can access this' });

    const book = await DigitalLibrary.findById(req.params.id);
    if (!book) return res.status(404).json({ message: 'Digital book not found' });
    if (book.branch.toString() !== admin.branch.toString()) return res.status(403).json({ message: 'Access denied' });

    const { title, subject, class: cls, stream, uploadDate } = req.body;
    if (title) book.title = title;
    if (subject) book.subject = subject;
    if (cls) book.class = cls;
    if (uploadDate) book.uploadDate = new Date(uploadDate);
    
    // Only update stream if it's provided and not empty
    if (stream && stream.trim()) {
      book.stream = stream;
    } else if (stream === '') {
      book.stream = null;
    }

    // If new file uploaded, replace old
    if (req.file) {
      const oldPath = path.join(__dirname, '..', '..', book.fileUrl);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      book.fileUrl = `/uploads/digital-library/${req.file.filename}`;
      book.fileName = req.file.originalname;
      book.fileSize = formatFileSize(req.file.size);
    }

    await book.save();
    await book.populate('class', 'className');
    res.status(200).json({ success: true, message: 'Digital book updated successfully', data: book });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Increment download count
exports.incrementDownload = async (req, res) => {
  try {
    const admin = await getAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Only library admin can access this' });

    const book = await DigitalLibrary.findByIdAndUpdate(
      req.params.id,
      { $inc: { downloads: 1 } },
      { new: true }
    ).lean();

    if (!book) return res.status(404).json({ message: 'Digital book not found' });

    res.status(200).json({ success: true, message: 'Download recorded', downloads: book.downloads });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete digital book + file
exports.remove = async (req, res) => {
  try {
    const admin = await getAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Only library admin can access this' });

    const book = await DigitalLibrary.findById(req.params.id);
    if (!book) return res.status(404).json({ message: 'Digital book not found' });
    if (book.branch.toString() !== admin.branch.toString()) return res.status(403).json({ message: 'Access denied' });

    // Delete physical file
    const filePath = path.join(__dirname, '..', '..', book.fileUrl);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await DigitalLibrary.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Digital book deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
