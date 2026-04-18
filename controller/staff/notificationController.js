const Notification = require('../../model/Notification');
const NotificationSettings = require('../../model/NotificationSettings');
const Staff = require('../../model/Staff');
const ParentStudent = require('../../model/ParentStudent');
const Teacher = require('../../model/Teacher');

const getBranch = async (userId) => {
  const staff = await Staff.findById(userId).lean();
  if (!staff) return null;
  return staff;
};

// Get all notifications
exports.getAll = async (req, res) => {
  try {
    const staff = await getBranch(req.userId);
    if (!staff) return res.status(403).json({ message: 'Access denied' });

    const { status, type } = req.query;
    const query = { branch: staff.branch };
    if (status) query.status = status;
    if (type) query.type = type;

    const [notifications, total, sent, pending] = await Promise.all([
      Notification.find(query).select('-createdBy').sort({ createdAt: -1 }).limit(100).lean(),
      Notification.countDocuments({ branch: staff.branch }),
      Notification.countDocuments({ branch: staff.branch, status: 'sent' }),
      Notification.countDocuments({ branch: staff.branch, status: 'pending' })
    ]);

    res.status(200).json({
      success: true,
      data: notifications,
      stats: { total, sent, pending }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Send notification to specific recipients
exports.send = async (req, res) => {
  try {
    const staff = await getBranch(req.userId);
    if (!staff) return res.status(403).json({ message: 'Access denied' });

    const { title, message, recipientType, recipientIds, method } = req.body;
    
    if (!title || !message) {
      return res.status(400).json({ message: 'title and message are required' });
    }

    if (!recipientType || recipientType.length === 0) {
      return res.status(400).json({ message: 'recipientType is required' });
    }

    // Validate recipient types
    const validTypes = ['parents', 'students', 'staff', 'teachers', 'all'];
    const invalidTypes = recipientType.filter(t => !validTypes.includes(t));
    if (invalidTypes.length > 0) {
      return res.status(400).json({ message: `Invalid recipient types: ${invalidTypes.join(', ')}` });
    }

    const notification = new Notification({
      type: 'custom',
      title,
      message,
      recipientType,
      recipientIds: recipientIds || [],
      method: method || 'email',
      status: 'sent',
      branch: staff.branch,
      client: staff.client,
      createdBy: req.userId
    });

    await notification.save();
    
    res.status(201).json({ 
      success: true, 
      message: 'Notification sent successfully', 
      data: notification 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete notification
exports.remove = async (req, res) => {
  try {
    const staff = await getBranch(req.userId);
    if (!staff) return res.status(403).json({ message: 'Access denied' });

    const notif = await Notification.findOneAndDelete({ _id: req.params.id, branch: staff.branch });
    if (!notif) return res.status(404).json({ message: 'Notification not found' });

    res.status(200).json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get settings
exports.getSettings = async (req, res) => {
  try {
    const staff = await getBranch(req.userId);
    if (!staff) return res.status(403).json({ message: 'Access denied' });

    let settings = await NotificationSettings.findOne({ branch: staff.branch }).lean();

    if (!settings) {
      settings = await NotificationSettings.create({
        branch: staff.branch,
        client: staff.client
      });
    }

    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Save settings
exports.saveSettings = async (req, res) => {
  try {
    const staff = await getBranch(req.userId);
    if (!staff) return res.status(403).json({ message: 'Access denied' });

    const { emailNotifications, smsNotifications, autoNotify } = req.body;

    const settings = await NotificationSettings.findOneAndUpdate(
      { branch: staff.branch },
      { emailNotifications, smsNotifications, autoNotify, client: staff.client },
      { new: true, upsert: true }
    ).lean();

    res.status(200).json({ success: true, message: 'Settings saved', data: settings });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get recipients by type
exports.getRecipients = async (req, res) => {
  try {
    const staff = await getBranch(req.userId);
    if (!staff) return res.status(403).json({ message: 'Access denied' });

    const { type } = req.query;
    if (!type) {
      return res.status(400).json({ message: 'type query parameter is required' });
    }

    let recipients = [];

    switch(type) {
      case 'parents':
        recipients = await ParentStudent.find({ branch: staff.branch, role: 'parent', status: true })
          .select('_id firstName lastName mobile')
          .lean();
        break;
      case 'students':
        recipients = await ParentStudent.find({ branch: staff.branch, role: 'student', status: true })
          .select('_id firstName lastName mobile')
          .lean();
        break;
      case 'staff':
        recipients = await Staff.find({ branch: staff.branch, status: true })
          .select('_id name email mobile')
          .lean();
        break;
      case 'teachers':
        recipients = await Teacher.find({ branch: staff.branch, status: true })
          .select('_id name email mobile')
          .lean();
        break;
      default:
        return res.status(400).json({ message: 'Invalid recipient type' });
    }

    res.status(200).json({ success: true, data: recipients });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
