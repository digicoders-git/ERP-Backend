const Admin = require('../../model/Admin');
const FeeCollection = require('../../model/FeeCollection');
const HostelLibraryFee = require('../../model/HostelLibraryFee');
const PaymentOption = require('../../model/PaymentOption');
const ScholarshipDiscount = require('../../model/ScholarshipDiscount');
const FeeSettings = require('../../model/FeeSettings');
const mongoose = require('mongoose');

const getAdmin = async (userId) => {
  const admin = await Admin.findById(userId).lean();
  if (!admin) return null;
  return admin;
};

// ─── RECEIPTS ────────────────────────────────────────────────────────────────

exports.getReceipts = async (req, res) => {
  try {
    const admin = await getAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Access denied' });

    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const query = { branch: admin.branch, status: { $in: ['paid', 'partial'] } };

    const [collections, total] = await Promise.all([
      FeeCollection.find(query)
        .populate('student', 'firstName lastName class rollNumber phone')
        .sort({ paymentDate: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      FeeCollection.countDocuments(query)
    ]);

    const receipts = collections.map((c, i) => ({
      id: `RCP${String(skip + i + 1).padStart(3, '0')}`,
      _id: c._id,
      student: c.student ? `${c.student.firstName} ${c.student.lastName}` : 'Unknown',
      class: c.student?.class || '',
      rollNo: c.student?.rollNumber || '',
      phone: c.student?.phone || '',
      amount: c.amountPaid,
      totalFee: c.amount,
      pendingFee: c.balance,
      feeType: c.feeType,
      paymentMode: c.paymentMode,
      date: new Date(c.paymentDate).toLocaleDateString('en-IN'),
      status: c.status === 'paid' ? 'Paid' : 'Partial'
    }));

    res.status(200).json({ success: true, data: receipts, total, page: parseInt(page) });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── HOSTEL & LIBRARY FEES ───────────────────────────────────────────────────

exports.getHostelLibraryFees = async (req, res) => {
  try {
    const admin = await getAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Access denied' });

    const fees = await HostelLibraryFee.find({ branch: admin.branch }).sort({ type: 1 }).lean();
    res.status(200).json({ success: true, data: fees });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createHostelLibraryFee = async (req, res) => {
  try {
    const admin = await getAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Access denied' });

    const { type, category, amount, description } = req.body;
    if (!type || !category || !amount) return res.status(400).json({ message: 'type, category and amount are required' });

    const fee = new HostelLibraryFee({ type, category, amount, description, branch: admin.branch, client: admin.client, createdBy: req.userId });
    await fee.save();
    res.status(201).json({ success: true, message: 'Fee added', data: fee });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateHostelLibraryFee = async (req, res) => {
  try {
    const admin = await getAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Access denied' });

    const fee = await HostelLibraryFee.findOneAndUpdate(
      { _id: req.params.id, branch: admin.branch },
      req.body, { new: true }
    ).lean();
    if (!fee) return res.status(404).json({ message: 'Fee not found' });
    res.status(200).json({ success: true, message: 'Fee updated', data: fee });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteHostelLibraryFee = async (req, res) => {
  try {
    const admin = await getAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Access denied' });

    const fee = await HostelLibraryFee.findOneAndDelete({ _id: req.params.id, branch: admin.branch });
    if (!fee) return res.status(404).json({ message: 'Fee not found' });
    res.status(200).json({ success: true, message: 'Fee deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── PAYMENT OPTIONS ─────────────────────────────────────────────────────────

exports.getPaymentOptions = async (req, res) => {
  try {
    const admin = await getAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Access denied' });

    const options = await PaymentOption.find({ branch: admin.branch }).sort({ method: 1 }).lean();
    res.status(200).json({ success: true, data: options });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createPaymentOption = async (req, res) => {
  try {
    const admin = await getAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Access denied' });

    const { method, gateway, status, charges } = req.body;
    if (!method || !gateway) return res.status(400).json({ message: 'method and gateway are required' });

    const option = new PaymentOption({ method, gateway, status: status || 'Active', charges: charges || 0, branch: admin.branch, client: admin.client, createdBy: req.userId });
    await option.save();
    res.status(201).json({ success: true, message: 'Payment option added', data: option });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updatePaymentOption = async (req, res) => {
  try {
    const admin = await getAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Access denied' });

    const option = await PaymentOption.findOneAndUpdate(
      { _id: req.params.id, branch: admin.branch },
      req.body, { new: true }
    ).lean();
    if (!option) return res.status(404).json({ message: 'Payment option not found' });
    res.status(200).json({ success: true, message: 'Updated', data: option });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deletePaymentOption = async (req, res) => {
  try {
    const admin = await getAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Access denied' });

    const option = await PaymentOption.findOneAndDelete({ _id: req.params.id, branch: admin.branch });
    if (!option) return res.status(404).json({ message: 'Payment option not found' });
    res.status(200).json({ success: true, message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── SCHOLARSHIP & DISCOUNT ──────────────────────────────────────────────────

exports.getScholarships = async (req, res) => {
  try {
    const admin = await getAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Access denied' });

    const records = await ScholarshipDiscount.find({ branch: admin.branch }).sort({ createdAt: -1 }).lean();
    res.status(200).json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createScholarship = async (req, res) => {
  try {
    const admin = await getAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Access denied' });

    const { studentId, name, type, amount, percentage, reason } = req.body;
    if (!studentId || !name || !type) return res.status(400).json({ message: 'studentId, name and type are required' });

    const record = new ScholarshipDiscount({ studentId, name, type, amount: amount || 0, percentage: percentage || 0, reason, branch: admin.branch, client: admin.client, createdBy: req.userId });
    await record.save();
    res.status(201).json({ success: true, message: 'Record added', data: record });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateScholarship = async (req, res) => {
  try {
    const admin = await getAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Access denied' });

    const record = await ScholarshipDiscount.findOneAndUpdate(
      { _id: req.params.id, branch: admin.branch },
      req.body, { new: true }
    ).lean();
    if (!record) return res.status(404).json({ message: 'Record not found' });
    res.status(200).json({ success: true, message: 'Updated', data: record });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteScholarship = async (req, res) => {
  try {
    const admin = await getAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Access denied' });

    const record = await ScholarshipDiscount.findOneAndDelete({ _id: req.params.id, branch: admin.branch });
    if (!record) return res.status(404).json({ message: 'Record not found' });
    res.status(200).json({ success: true, message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── PENDING FEE ALERTS ──────────────────────────────────────────────────────

exports.getPendingAlerts = async (req, res) => {
  try {
    const admin = await getAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Access denied' });

    const branch = new mongoose.Types.ObjectId(admin.branch);
    const now = new Date();

    const [pending, aggStats] = await Promise.all([
      FeeCollection.find({ branch, status: { $in: ['pending', 'partial'] } })
        .populate('student', 'firstName lastName class rollNumber')
        .sort({ paymentDate: 1 })
        .limit(100)
        .lean(),
      FeeCollection.aggregate([
        { $match: { branch, status: { $in: ['pending', 'partial'] } } },
        { $group: { _id: null, totalAmount: { $sum: '$balance' }, count: { $sum: 1 } } }
      ])
    ]);

    const alerts = pending.map(p => {
      const daysOverdue = Math.floor((now - new Date(p.paymentDate)) / (1000 * 60 * 60 * 24));
      const status = daysOverdue > 20 ? 'Critical' : daysOverdue > 10 ? 'Pending' : 'Warning';
      return {
        _id: p._id,
        studentId: p.student?.rollNumber || '',
        name: p.student ? `${p.student.firstName} ${p.student.lastName}` : 'Unknown',
        class: p.student?.class || '',
        amount: p.balance,
        daysOverdue,
        status,
        feeType: p.feeType
      };
    });

    const critical = alerts.filter(a => a.status === 'Critical').length;
    const warning = alerts.filter(a => a.status === 'Warning').length;

    res.status(200).json({
      success: true,
      data: alerts,
      stats: {
        total: alerts.length,
        critical,
        pending: alerts.length - critical - warning,
        warning,
        totalAmount: aggStats[0]?.totalAmount || 0
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── SETTINGS ────────────────────────────────────────────────────────────────

exports.getSettings = async (req, res) => {
  try {
    const admin = await getAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Access denied' });

    let settings = await FeeSettings.findOne({ branch: admin.branch }).lean();
    if (!settings) settings = await FeeSettings.create({ branch: admin.branch, client: admin.client });

    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.saveSettings = async (req, res) => {
  try {
    const admin = await getAdmin(req.userId);
    if (!admin) return res.status(403).json({ message: 'Access denied' });

    const settings = await FeeSettings.findOneAndUpdate(
      { branch: admin.branch },
      { ...req.body, client: admin.client },
      { new: true, upsert: true }
    ).lean();

    res.status(200).json({ success: true, message: 'Settings saved', data: settings });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
