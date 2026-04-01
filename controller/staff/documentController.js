const StudentDocument = require('../../model/StudentDocument');
const Admin = require('../../model/Admin');
const fs = require('fs');
const path = require('path');

const getBranch = async (userId) => {
  const admin = await Admin.findById(userId).lean();
  if (!admin) return null;
  return admin;
};

const formatSize = (bytes) => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

// Get all documents + stats in one call
exports.getAll = async (req, res) => {
  try {
    const admin = await getBranch(req.userId);
    if (!admin) return res.status(403).json({ message: 'Access denied' });

    const { status, type, search } = req.query;
    const query = { branch: admin.branch };
    if (status) query.status = status;
    if (type) query.type = type;
    if (search) {
      query.$or = [
        { studentName: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } }
      ];
    }

    const [docs, total, verified, pending, rejected] = await Promise.all([
      StudentDocument.find(query).select('-createdBy').sort({ createdAt: -1 }).lean(),
      StudentDocument.countDocuments({ branch: admin.branch }),
      StudentDocument.countDocuments({ branch: admin.branch, status: 'verified' }),
      StudentDocument.countDocuments({ branch: admin.branch, status: 'pending' }),
      StudentDocument.countDocuments({ branch: admin.branch, status: 'rejected' })
    ]);

    res.status(200).json({
      success: true,
      data: docs,
      stats: { total, verified, pending, rejected }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Upload document
exports.upload = async (req, res) => {
  try {
    const admin = await getBranch(req.userId);
    if (!admin) return res.status(403).json({ message: 'Access denied' });

    const { studentName, studentId, type, status } = req.body;
    if (!studentName || !type) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'studentName and type are required' });
    }

    const doc = new StudentDocument({
      studentName, studentId, type,
      status: status || 'pending',
      fileUrl: req.file ? `/uploads/documents/${req.file.filename}` : null,
      fileName: req.file ? req.file.originalname : null,
      fileSize: req.file ? formatSize(req.file.size) : null,
      branch: admin.branch,
      client: admin.client,
      createdBy: req.userId
    });

    await doc.save();
    res.status(201).json({ success: true, message: 'Document uploaded successfully', data: doc });
  } catch (error) {
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update status (verify/reject)
exports.updateStatus = async (req, res) => {
  try {
    const admin = await getBranch(req.userId);
    if (!admin) return res.status(403).json({ message: 'Access denied' });

    const { status } = req.body;
    if (!['verified', 'pending', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const doc = await StudentDocument.findOneAndUpdate(
      { _id: req.params.id, branch: admin.branch },
      { status },
      { new: true }
    ).lean();

    if (!doc) return res.status(404).json({ message: 'Document not found' });
    res.status(200).json({ success: true, message: `Document ${status}`, data: doc });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete document
exports.remove = async (req, res) => {
  try {
    const admin = await getBranch(req.userId);
    if (!admin) return res.status(403).json({ message: 'Access denied' });

    const doc = await StudentDocument.findOne({ _id: req.params.id, branch: admin.branch });
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    if (doc.fileUrl) {
      const filePath = path.join(__dirname, '..', '..', doc.fileUrl);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await StudentDocument.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Document deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
