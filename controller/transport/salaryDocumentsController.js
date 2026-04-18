const Driver = require('../../model/Driver');
const DriverSalary = require('../../model/DriverSalary');
const DriverDocument = require('../../model/DriverDocument');
const Admin = require('../../model/Admin');
const Staff = require('../../model/Staff');

const getDriver = async (driverId) =>  {
  const driver = await Driver.findById(driverId).lean();
  if (!driver) return null;
  return driver;

};

// Get salary info + history for driver
exports.getSalaryInfo = async (req, res) => {
  try {
    const driver = await getDriver(req.driverId);
    if (!driver) return res.status(404).json({ message: 'Driver not found' });

    const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

    const salaryHistory = await DriverSalary.find({ driver: req.driverId })
      .sort({ createdAt: -1 }).limit(12).lean();

    const currentSalary = salaryHistory.find(s => s.month === currentMonth) || salaryHistory[0] || null;

    res.status(200).json({
      success: true,
      data: {
        currentMonth,
        monthlySalary: currentSalary?.baseSalary || 0,
        paymentStatus: currentSalary?.status || 'Pending',
        paymentDate: currentSalary?.paymentDate || null,
        salaryHistory: salaryHistory.map(s => ({
          month: s.month,
          baseSalary: s.baseSalary,
          allowances: s.allowances,
          deductions: s.deductions,
          netSalary: s.netSalary,
          status: s.status,
          paymentDate: s.paymentDate
        }))
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Admin/Staff — add/update driver salary
exports.upsertSalary = async (req, res) => {
  try {
    // flexibleAuth already verified user; req.user has role & branch
    if (!req.user) return res.status(403).json({ message: 'Access denied' });

    const { driverId, month, baseSalary, allowances = 0, deductions = 0, status, paymentDate } = req.body;
    if (!driverId || !month || !baseSalary) {
      return res.status(400).json({ message: 'driverId, month and baseSalary are required' });
    }

    const driver = await Driver.findById(driverId).lean();
    if (!driver) return res.status(404).json({ message: 'Driver not found' });

    const b = Number(baseSalary) || 0;
    const a = Number(allowances) || 0;
    const d = Number(deductions) || 0;
    const netSalary = b + a - d;

    const salary = await DriverSalary.findOneAndUpdate(
      { driver: driverId, month },
      { driver: driverId, driverName: driver.name, month, baseSalary, allowances, deductions, netSalary, status: status || 'Pending', paymentDate: paymentDate || null, branch: driver.branch, client: driver.client, createdBy: req.userId },
      { new: true, upsert: true }
    ).lean();

    res.status(200).json({ success: true, message: 'Salary saved', data: salary });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Admin/Staff — get all driver salaries for branch
exports.getAllDriverSalaries = async (req, res) => {
  try {
    // flexibleAuth sets req.user with branch info
    if (!req.user) return res.status(403).json({ message: 'Access denied' });

    const { month, status } = req.query;
    const query = {};
    if (req.user.branch) query.branch = req.user.branch;
    if (month) query.month = month;
    if (status) query.status = status;

    const salaries = await DriverSalary.find(query)
      .populate('driver', 'name mobileNo licenseNo')
      .sort({ createdAt: -1 }).lean();

    res.status(200).json({ success: true, data: salaries });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Admin/Staff — delete driver salary
exports.deleteSalary = async (req, res) => {
  try {
    if (!req.user) return res.status(403).json({ message: 'Access denied' });

    const salary = await DriverSalary.findByIdAndDelete(req.params.id);
    if (!salary) return res.status(404).json({ message: 'Salary record not found' });

    res.status(200).json({ success: true, message: 'Salary deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get driver documents
exports.getDocuments = async (req, res) => {
  try {
    const driver = await getDriver(req.driverId);
    if (!driver) return res.status(404).json({ message: 'Driver not found' });

    // Auto-update expiry status
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await DriverDocument.updateMany(
      { driver: req.driverId, expiryDate: { $lt: now } },
      { $set: { status: 'Expired' } }
    );
    await DriverDocument.updateMany(
      { driver: req.driverId, expiryDate: { $gte: now, $lte: thirtyDaysLater } },
      { $set: { status: 'Expiring Soon' } }
    );

    const docs = await DriverDocument.find({ driver: req.driverId }).sort({ docType: 1 }).lean();

    // Also include license from Driver model
    const licenseDoc = {
      docType: 'Driving License',
      number: driver.licenseNo,
      expiryDate: driver.licenseExpiryDate,
      status: new Date(driver.licenseExpiryDate) < now ? 'Expired' :
              new Date(driver.licenseExpiryDate) < thirtyDaysLater ? 'Expiring Soon' : 'Valid'
    };

    res.status(200).json({ success: true, data: { licenseFromProfile: licenseDoc, documents: docs } });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Admin — add/update driver document
exports.upsertDocument = async (req, res) => {
  try {
    const admin = await Admin.findById(req.userId).lean();
    if (!admin) return res.status(403).json({ message: 'Access denied' });

    const { driverId, docType, number, issueDate, expiryDate } = req.body;
    if (!driverId || !docType) return res.status(400).json({ message: 'driverId and docType are required' });

    const driver = await Driver.findById(driverId).lean();
    if (!driver) return res.status(404).json({ message: 'Driver not found' });

    const now = new Date();
    const expiry = expiryDate ? new Date(expiryDate) : null;
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    let status = 'Valid';
    if (expiry) {
      if (expiry < now) status = 'Expired';
      else if (expiry < thirtyDaysLater) status = 'Expiring Soon';
    }

    const doc = await DriverDocument.findOneAndUpdate(
      { driver: driverId, docType },
      { driver: driverId, docType, number, issueDate, expiryDate, status,
        fileUrl: req.file ? `/uploads/documents/${req.file.filename}` : undefined,
        branch: driver.branch, client: driver.client, createdBy: req.userId },
      { new: true, upsert: true }
    ).lean();

    res.status(200).json({ success: true, message: 'Document saved', data: doc });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Admin — get all documents for a driver
exports.getDriverDocuments = async (req, res) => {
  try {
    const docs = await DriverDocument.find({ driver: req.params.driverId })
      .sort({ docType: 1 })
      .lean();

    res.status(200).json({ success: true, data: docs });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
