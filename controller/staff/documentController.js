const StudentDocument = require('../../model/StudentDocument');
const Student = require('../../model/Student');
const Staff = require('../../model/Staff');
const fs = require('fs');
const path = require('path');

const getBranch = async (userId) => {
  const staff = await Staff.findById(userId).lean();
  if (!staff) return null;
  return staff;
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
    const staff = await Staff.findById(req.userId).lean();
    if (!staff) return res.status(403).json({ success: false, message: 'Access denied' });

    const { status, type, search, page = 1, limit = 10, startDate, endDate, dateFilter } = req.query;
    const branchQuery = { branch: staff.branch };
    
    // Date Filtering Logic
    let dateRangeQuery = {};
    const now = new Date();
    
    if (dateFilter === 'today') {
      const todayStart = new Date(now.setHours(0, 0, 0, 0));
      const todayEnd = new Date(now.setHours(23, 59, 59, 999));
      dateRangeQuery = { createdAt: { $gte: todayStart, $lte: todayEnd } };
    } else if (dateFilter === 'thisMonth') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      dateRangeQuery = { createdAt: { $gte: monthStart } };
    } else if (dateFilter === 'thisYear') {
      const yearStart = new Date(now.getFullYear(), 0, 1);
      dateRangeQuery = { createdAt: { $gte: yearStart } };
    } else if (startDate && endDate) {
      dateRangeQuery = { createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) } };
    }

    // 1. Fetch from StudentDocument registry
    const docQuery = { ...branchQuery, ...dateRangeQuery };
    if (status) docQuery.status = status;
    if (type) docQuery.type = type;
    if (search) {
      docQuery.$or = [
        { studentName: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } }
      ];
    }
    const standaloneDocs = await StudentDocument.find(docQuery).sort({ createdAt: -1 }).lean();

    // 2. Smart Discovery: Scan Student collection for any legacy/embedded documents
    const studentQuery = { ...branchQuery };
    if (dateRangeQuery.createdAt) studentQuery.createdAt = dateRangeQuery.createdAt;
    
    const students = await Student.find(studentQuery).lean();
    const discoveredDocs = [];

    students.forEach(s => {
      const possibleDocs = [
        { path: s.profileImage, type: 'Photo', key: 'photo' },
        { path: s.medicalCertificate, type: 'Birth Certificate', key: 'medical' },
        { path: s.casteCertificate, type: 'ID Proof', key: 'caste' },
        ...(s.documents ? Object.entries(s.documents).map(([k, v]) => ({ path: v, type: k.charAt(0).toUpperCase() + k.slice(1), key: k })) : []),
        ...(s.previousEducation ? [
          { path: s.previousEducation.marksheet, type: 'Marksheet', key: 'prev_marksheet' },
          { path: s.previousEducation.characterCertificate, type: 'Other', key: 'prev_char' },
          { path: s.previousEducation.transferCertificate, type: 'Transfer Certificate', key: 'prev_tc' }
        ] : [])
      ];

      possibleDocs.forEach(d => {
        if (d.path && typeof d.path === 'string' && d.path.trim() !== '') {
          const isDuplicate = standaloneDocs.some(sd => sd.fileUrl === d.path);
          if (!isDuplicate) {
            const docStatus = s.verificationStatus || 'pending';
            if ((!status || status === docStatus) && (!type || type === d.type)) {
               const fullName = (s.firstName + ' ' + s.lastName).toLowerCase();
               const admNo = (s.admissionNumber || '').toLowerCase();
               const sTerm = (search || '').toLowerCase();
               
               if (!search || fullName.includes(sTerm) || admNo.includes(sTerm)) {
                  discoveredDocs.push({
                    _id: `discovery_${s._id}_${d.key}`,
                    studentName: (s.firstName + ' ' + s.lastName).trim() || s.name,
                    studentId: s.admissionNumber || s._id.toString(),
                    type: d.type.replace(/([A-Z])/g, ' $1').trim(),
                    fileUrl: d.path,
                    fileName: d.path.split('/').pop(),
                    status: docStatus,
                    createdAt: s.createdAt,
                    isDiscovered: true
                  });
               }
            }
          }
        }
      });
    });

    // 3. Unify and Sort
    const unifiedDocs = [...standaloneDocs, ...discoveredDocs].sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );

    // 4. Calculate stats based on unified list
    const stats = {
      total: unifiedDocs.length,
      verified: unifiedDocs.filter(d => d.status === 'verified').length,
      pending: unifiedDocs.filter(d => d.status === 'pending').length,
      rejected: unifiedDocs.filter(d => d.status === 'rejected').length
    };

    // 5. Apply Pagination
    const p = parseInt(page);
    const l = parseInt(limit);
    const startIndex = (p - 1) * l;
    const paginatedDocs = unifiedDocs.slice(startIndex, startIndex + l);

    res.status(200).json({
      success: true,
      data: paginatedDocs,
      stats: stats,
      pagination: {
        total: unifiedDocs.length,
        page: p,
        limit: l,
        totalPages: Math.ceil(unifiedDocs.length / l)
      }
    });
  } catch (error) {
    console.error('Document Discovery Error:', error);
    res.status(500).json({ success: false, message: 'Institutional Registry Error', error: error.message });
  }
};

// Upload document
exports.upload = async (req, res) => {
  try {
    const staff = await getBranch(req.userId);
    if (!staff) return res.status(403).json({ message: 'Access denied' });

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
      branch: staff.branch,
      client: staff.client,
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
    const staff = await getBranch(req.userId);
    if (!staff) return res.status(403).json({ message: 'Access denied' });

    const { status } = req.body;
    if (!['verified', 'pending', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const doc = await StudentDocument.findOneAndUpdate(
      { _id: req.params.id, branch: staff.branch },
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
    const staff = await getBranch(req.userId);
    if (!staff) return res.status(403).json({ message: 'Access denied' });

    const doc = await StudentDocument.findOne({ _id: req.params.id, branch: staff.branch });
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
