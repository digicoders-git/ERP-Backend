const Driver = require('../../model/Driver');
const Salary = require('../../model/Salary');
const DriverDocument = require('../../model/DriverDocument');
const Admin = require('../../model/Admin');

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

    const salaryHistory = await Salary.find({ teacherName: driver.name, branch: driver.branch })
      .sort({ createdAt: -1 })
      .limit(12)
      .lean();

    const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    const currentSalary = salaryHistory.find(s => s.month === currentMonth) || salaryHistory[0] || null;

    res.status(200).json({
      success: true,
      data: {
        monthlySalary: driver.salary || currentSalary?.baseSalary || 0,
        currentMonth,
        paymentStatus: currentSalary?.status || 'Pending',
        paymentDate: currentSalary?.paymentDate || null,
        salaryHistory: salaryHistory.map(s => ({
          month: s.month,
          amount: s.netSalary || s.baseSalary,
          status: s.status,
          date: s.paymentDate
        }))
      }
    });
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
      { driver: driverId, docType, number, issueDate, expiryDate, status, branch: driver.branch, client: driver.client, createdBy: req.userId },
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
