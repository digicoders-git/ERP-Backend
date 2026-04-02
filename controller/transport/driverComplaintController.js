const DriverComplaint = require('../../model/DriverComplaint');
const Driver = require('../../model/Driver');

const getDriver = async (driverId) => {
  const driver = await Driver.findById(driverId).lean();
  if (!driver) return null;
  return driver;
};

// Submit emergency or complaint
exports.submit = async (req, res) => {
  try {
    const driver = await getDriver(req.driverId);
    if (!driver) return res.status(404).json({ message: 'Driver not found' });

    const { reportType, category, description } = req.body;
    if (!reportType || !category || !description) {
      return res.status(400).json({ message: 'reportType, category and description are required' });
    }

    const complaint = new DriverComplaint({
      driver: req.driverId,
      reportType, category, description,
      status: 'Pending',
      branch: driver.branch,
      client: driver.client
    });

    await complaint.save();
    res.status(201).json({ success: true, message: `${reportType === 'emergency' ? 'Emergency alert' : 'Complaint'} submitted successfully`, data: complaint });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get driver's own history
exports.getMyHistory = async (req, res) => {
  try {
    const driver = await getDriver(req.driverId);
    if (!driver) return res.status(404).json({ message: 'Driver not found' });

    const reports = await DriverComplaint.find({ driver: req.driverId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.status(200).json({ success: true, data: reports });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Admin — get all for branch + stats
exports.getAllForBranch = async (req, res) => {
  try {
    const { status, reportType } = req.query;

    let branchId = req.user?.branch;
    if (!branchId) {
      const Admin = require('../../model/Admin');
      const admin = await Admin.findById(req.userId).lean();
      if (!admin) return res.status(403).json({ message: 'Access denied' });
      branchId = admin.branch;
    }

    const query = { branch: branchId };
    if (status) query.status = status;
    if (reportType) query.reportType = reportType;

    const [reports, pending, inProgress, resolved, emergencies] = await Promise.all([
      DriverComplaint.find(query)
        .populate('driver', 'name mobileNo')
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),
      DriverComplaint.countDocuments({ branch: branchId, status: 'Pending' }),
      DriverComplaint.countDocuments({ branch: branchId, status: 'In Progress' }),
      DriverComplaint.countDocuments({ branch: branchId, status: 'Resolved' }),
      DriverComplaint.countDocuments({ branch: branchId, reportType: 'emergency', status: 'Pending' })
    ]);

    res.status(200).json({
      success: true,
      data: reports,
      stats: { pending, inProgress, resolved, emergencies }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Admin — update status
exports.updateStatus = async (req, res) => {
  try {
    const { status, resolvedNote } = req.body;
    if (!['Pending', 'In Progress', 'Resolved'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const report = await DriverComplaint.findByIdAndUpdate(
      req.params.id,
      { status, resolvedNote },
      { new: true }
    ).lean();

    if (!report) return res.status(404).json({ message: 'Report not found' });
    res.status(200).json({ success: true, message: 'Status updated', data: report });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
