const Notification = require('../../model/Notification');
const NotificationSettings = require('../../model/NotificationSettings');
const Admin = require('../../model/Admin');

const getBranch = async (userId) => {
  const admin = await Admin.findById(userId).lean();
  if (!admin) return null;
  return admin;
};

// Get all notifications + stats in one call
exports.getAll = async (req, res) => {
  try {
    const admin = await getBranch(req.userId);
    if (!admin) return res.status(403).json({ message: 'Access denied' });

    const { status, type } = req.query;
    const query = { branch: admin.branch };
    if (status) query.status = status;
    if (type) query.type = type;

    const [notifications, total, sent, pending, emailSent, smsSent] = await Promise.all([
      Notification.find(query).select('-createdBy').sort({ createdAt: -1 }).limit(100).lean(),
      Notification.countDocuments({ branch: admin.branch }),
      Notification.countDocuments({ branch: admin.branch, status: 'sent' }),
      Notification.countDocuments({ branch: admin.branch, status: 'pending' }),
      Notification.countDocuments({ branch: admin.branch, method: 'email', status: 'sent' }),
      Notification.countDocuments({ branch: admin.branch, method: 'sms', status: 'sent' })
    ]);

    res.status(200).json({
      success: true,
      data: notifications,
      stats: { total, sent, pending, emailSent, smsSent }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Send notification
exports.send = async (req, res) => {
  try {
    const admin = await getBranch(req.userId);
    if (!admin) return res.status(403).json({ message: 'Access denied' });

    const { type, title, message, recipients, method } = req.body;
    if (!title || !message) {
      return res.status(400).json({ message: 'title and message are required' });
    }

    const notification = new Notification({
      type: type || 'custom',
      title, message, recipients,
      method: method || 'email',
      status: 'sent',
      branch: admin.branch,
      client: admin.client,
      createdBy: req.userId
    });

    await notification.save();
    res.status(201).json({ success: true, message: 'Notification sent successfully', data: notification });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete notification
exports.remove = async (req, res) => {
  try {
    const admin = await getBranch(req.userId);
    if (!admin) return res.status(403).json({ message: 'Access denied' });

    const notif = await Notification.findOneAndDelete({ _id: req.params.id, branch: admin.branch });
    if (!notif) return res.status(404).json({ message: 'Notification not found' });

    res.status(200).json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get settings
exports.getSettings = async (req, res) => {
  try {
    const admin = await getBranch(req.userId);
    if (!admin) return res.status(403).json({ message: 'Access denied' });

    let settings = await NotificationSettings.findOne({ branch: admin.branch }).lean();

    // Auto-create default settings if not exist
    if (!settings) {
      settings = await NotificationSettings.create({
        branch: admin.branch,
        client: admin.client
      });
    }

    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Save settings (upsert)
exports.saveSettings = async (req, res) => {
  try {
    const admin = await getBranch(req.userId);
    if (!admin) return res.status(403).json({ message: 'Access denied' });

    const { emailNotifications, smsNotifications, absenceThreshold, lateThreshold, autoNotify, notifyParents, notifyAdmin } = req.body;

    const settings = await NotificationSettings.findOneAndUpdate(
      { branch: admin.branch },
      { emailNotifications, smsNotifications, absenceThreshold, lateThreshold, autoNotify, notifyParents, notifyAdmin, client: admin.client },
      { new: true, upsert: true }
    ).lean();

    res.status(200).json({ success: true, message: 'Settings saved', data: settings });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
