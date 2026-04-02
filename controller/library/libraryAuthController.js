const Admin = require('../../model/Admin');
const LibrarySettings = require('../../model/LibrarySettings');
const jwt = require('jsonwebtoken');

// Library Admin Login — accepts email as id field (frontend uses 'id')
exports.login = async (req, res) => {
  try {
    const { id, password, email } = req.body;
    const loginId = email || id;

    if (!loginId || !password) {
      return res.status(400).json({ message: 'ID/Email and password are required' });
    }

    const admin = await Admin.findOne({ email: loginId, role: 'libraryAdmin' });
    if (!admin) return res.status(401).json({ message: 'Invalid credentials' });
    if (!admin.status) return res.status(403).json({ message: 'Account is inactive' });

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { _id: admin._id, role: admin.role, email: admin.email, branch: admin.branch, client: admin.client },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: { id: admin._id, email: admin.email, role: admin.role, branch: admin.branch, client: admin.client }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Settings (auto-create defaults if not exist)
exports.getSettings = async (req, res) => {
  try {
    const admin = await Admin.findById(req.userId).lean();
    if (!admin || admin.role !== 'libraryAdmin') return res.status(403).json({ message: 'Access denied' });

    if (!admin.branch || !admin.client) {
      return res.status(400).json({ message: 'Librarian account is missing branch or client. Please update the librarian record.' });
    }

    let settings = await LibrarySettings.findOne({ branch: admin.branch }).lean();
    if (!settings) {
      settings = await LibrarySettings.create({ branch: admin.branch, client: admin.client });
    }

    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Save Settings (upsert)
exports.saveSettings = async (req, res) => {
  try {
    const admin = await Admin.findById(req.userId).lean();
    if (!admin || admin.role !== 'libraryAdmin') return res.status(403).json({ message: 'Access denied' });

    const { libraryName, maxBooksPerMember, loanPeriodDays, finePerDay, maxRenewalTimes, emailNotifications, smsNotifications, autoReminders, theme, font } = req.body;

    const settings = await LibrarySettings.findOneAndUpdate(
      { branch: admin.branch },
      { libraryName, maxBooksPerMember, loanPeriodDays, finePerDay, maxRenewalTimes, emailNotifications, smsNotifications, autoReminders, theme, font, client: admin.client },
      { new: true, upsert: true }
    ).lean();

    res.status(200).json({ success: true, message: 'Settings saved successfully', data: settings });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
