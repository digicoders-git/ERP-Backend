const LibraryCard = require('../../model/LibraryCard');
const Admin = require('../../model/Admin');

const getAdmin = async (adminId) => {
  const admin = await Admin.findById(adminId).lean();
  if (!admin || admin.role !== 'libraryAdmin') return null;
  return admin;
};

exports.getAll = async (req, res) => {
  try {
    const admin = await getAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Only library admin can access this' });

    const { status } = req.query;
    const query = { branch: admin.branch };
    if (status) query.status = status;

    // Auto-expire cards whose expiryDate has passed
    await LibraryCard.updateMany(
      { branch: admin.branch, status: 'Active', expiryDate: { $lt: new Date() } },
      { $set: { status: 'Expired' } }
    );

    const cards = await LibraryCard.find(query).sort({ createdAt: -1 }).lean();
    res.status(200).json({ success: true, data: cards });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const admin = await getAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Only library admin can access this' });

    const { cardId, studentId, studentName, class: cls, issueDate, expiryDate, status } = req.body;
    if (!cardId || !studentId || !studentName || !cls || !expiryDate) {
      return res.status(400).json({ message: 'cardId, studentId, studentName, class and expiryDate are required' });
    }

    const existing = await LibraryCard.findOne({ cardId, branch: admin.branch });
    if (existing) return res.status(400).json({ message: 'Card ID already exists' });

    const card = new LibraryCard({
      cardId, studentId, studentName, class: cls,
      issueDate: issueDate || new Date(),
      expiryDate,
      status: status || 'Active',
      branch: admin.branch,
      client: admin.client,
      createdBy: req.userId
    });

    await card.save();
    res.status(201).json({ success: true, message: 'Library card created successfully', data: card });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const admin = await getAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Only library admin can access this' });

    const card = await LibraryCard.findById(req.params.id);
    if (!card) return res.status(404).json({ message: 'Library card not found' });
    if (card.branch.toString() !== admin.branch.toString()) return res.status(403).json({ message: 'Access denied' });

    const { cardId, studentId, studentName, class: cls, issueDate, expiryDate, status } = req.body;
    if (cardId) card.cardId = cardId;
    if (studentId) card.studentId = studentId;
    if (studentName) card.studentName = studentName;
    if (cls) card.class = cls;
    if (issueDate) card.issueDate = issueDate;
    if (expiryDate) card.expiryDate = expiryDate;
    if (status) card.status = status;

    await card.save();
    res.status(200).json({ success: true, message: 'Library card updated successfully', data: card });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.renew = async (req, res) => {
  try {
    const admin = await getAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Only library admin can access this' });

    const card = await LibraryCard.findById(req.params.id);
    if (!card) return res.status(404).json({ message: 'Library card not found' });
    if (card.branch.toString() !== admin.branch.toString()) return res.status(403).json({ message: 'Access denied' });

    const newExpiry = new Date();
    newExpiry.setFullYear(newExpiry.getFullYear() + 1);
    card.expiryDate = newExpiry;
    card.status = 'Active';

    await card.save();
    res.status(200).json({ success: true, message: 'Library card renewed for 1 year', data: card });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const admin = await getAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Only library admin can access this' });

    const card = await LibraryCard.findById(req.params.id);
    if (!card) return res.status(404).json({ message: 'Library card not found' });
    if (card.branch.toString() !== admin.branch.toString()) return res.status(403).json({ message: 'Access denied' });

    await LibraryCard.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Library card deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
