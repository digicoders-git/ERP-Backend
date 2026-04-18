const jwt = require('jsonwebtoken');
const Admin = require('../model/Admin');
const Staff = require('../model/Staff');
const Warden = require('../model/Warden');
const Driver = require('../model/Driver');

const flexibleAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    // Standardize IDs from various panel tokens
    const userId = decoded._id || decoded.id || decoded.userId || decoded.wardenId;

    // Try to find user in Admin model
    let user = await Admin.findById(userId).select('_id email role branch client status').lean();
    
    // If not found in Admin, try Staff model
    if (!user) {
      user = await Staff.findById(userId).select('_id email role branch status').lean();
    }

    // If still not found, try Warden model
    if (!user) {
      user = await Warden.findById(userId).select('_id email status assignedHostel branch client').lean();
      if (user) user.role = 'warden';
    }

    // NEW: If still not found, try Driver model (Transport Panel Support)
    if (!user) {
      user = await Driver.findById(userId).select('_id email role branch client status').lean();
      if (user) {
        user.role = 'driver';
      }
    }

    if (!user) {
      return res.status(401).json({ message: 'User not found or session invalid' });
    }

    if (user.status === false) {
      return res.status(403).json({ message: 'Account is inactive' });
    }

    req.userId = userId;
    req.user = {
      _id: userId,
      userId: userId,
      role: decoded.role || user.role,
      branch: decoded.branch || user.branch?._id || user.branch,
      client: decoded.client || user.client?._id || user.client,
      assignedHostel: user.assignedHostel,
      teacher: decoded.teacher
    };
    
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Authentication failed', error: error.message });
  }
};

module.exports = flexibleAuth;
