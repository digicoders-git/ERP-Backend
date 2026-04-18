const Notification = require('../model/Notification');
const NotificationSettings = require('../model/NotificationSettings');
const Branch = require('../model/Branch');
const Staff = require('../model/Staff');

// Helper to get branch ID for the staff member
const getBranch = async (staffId) => {
  const staff = await Staff.findById(staffId);
  return staff ? staff.branch : null;
};

exports.getNotifications = async (req, res) => {
  try {
    const branch = await getBranch(req.userId);
    if (!branch) return res.status(403).json({ message: 'Access denied' });

    const notifications = await Notification.find({ branch })
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.sendNotification = async (req, res) => {
  try {
    const branch = await getBranch(req.userId);
    if (!branch) return res.status(403).json({ message: 'Access denied' });

    const branchData = await Branch.findById(branch);

    const { type, title, message, recipients, method } = req.body;

    const notification = await Notification.create({
      type,
      title,
      message,
      recipients,
      method,
      status: 'sent', // Integrating real dispatch logic here if gateway available
      branch,
      client: branchData.client,
      createdBy: req.userId
    });

    res.status(201).json({ message: 'Dispatch executed successfully', notification });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getSettings = async (req, res) => {
  try {
    const branch = await getBranch(req.userId);
    if (!branch) return res.status(403).json({ message: 'Access denied' });

    let settings = await NotificationSettings.findOne({ branch });
    
    // Create default settings if not exists
    if (!settings) {
      const branchData = await Branch.findById(branch);
      settings = await NotificationSettings.create({
        branch,
        client: branchData.client
      });
    }

    res.status(200).json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const branch = await getBranch(req.userId);
    if (!branch) return res.status(403).json({ message: 'Access denied' });

    const settings = await NotificationSettings.findOneAndUpdate(
      { branch },
      { $set: req.body },
      { new: true, upsert: true }
    );

    res.status(200).json({ message: 'Settings updated successfully', settings });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
