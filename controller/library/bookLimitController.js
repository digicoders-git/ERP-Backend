const BookLimit = require('../../model/BookLimit');
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

    const limits = await BookLimit.find({ branch: admin.branch }).sort({ class: 1 }).lean();
    res.status(200).json({ success: true, data: limits });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const admin = await getAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Only library admin can access this' });

    const { class: cls, maxBooks, maxDays, renewalAllowed, renewalTimes } = req.body;
    if (!cls || !maxBooks || !maxDays) {
      return res.status(400).json({ message: 'class, maxBooks and maxDays are required' });
    }

    const existing = await BookLimit.findOne({ branch: admin.branch, class: cls });
    if (existing) return res.status(400).json({ message: `Limit for ${cls} already exists. Use update instead.` });

    const limit = new BookLimit({
      class: cls, maxBooks, maxDays,
      renewalAllowed: renewalAllowed !== undefined ? renewalAllowed : true,
      renewalTimes: renewalTimes || 2,
      branch: admin.branch,
      client: admin.client,
      createdBy: req.userId
    });

    await limit.save();
    res.status(201).json({ success: true, message: 'Book limit created successfully', data: limit });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const admin = await getAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Only library admin can access this' });

    const limit = await BookLimit.findById(req.params.id);
    if (!limit) return res.status(404).json({ message: 'Book limit not found' });
    if (limit.branch.toString() !== admin.branch.toString()) return res.status(403).json({ message: 'Access denied' });

    const { class: cls, maxBooks, maxDays, renewalAllowed, renewalTimes } = req.body;
    if (cls) limit.class = cls;
    if (maxBooks) limit.maxBooks = maxBooks;
    if (maxDays) limit.maxDays = maxDays;
    if (renewalAllowed !== undefined) limit.renewalAllowed = renewalAllowed;
    if (renewalTimes !== undefined) limit.renewalTimes = renewalTimes;

    await limit.save();
    res.status(200).json({ success: true, message: 'Book limit updated successfully', data: limit });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const admin = await getAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Only library admin can access this' });

    const limit = await BookLimit.findById(req.params.id);
    if (!limit) return res.status(404).json({ message: 'Book limit not found' });
    if (limit.branch.toString() !== admin.branch.toString()) return res.status(403).json({ message: 'Access denied' });

    await BookLimit.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Book limit deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get limit for a specific class (used during book issue validation)
exports.getLimitByClass = async (req, res) => {
  try {
    const admin = await getAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Only library admin can access this' });

    const limit = await BookLimit.findOne({ branch: admin.branch, class: req.params.class }).lean();
    if (!limit) return res.status(404).json({ message: 'No limit configured for this class' });

    res.status(200).json({ success: true, data: limit });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
