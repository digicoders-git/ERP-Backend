const jwt = require('jsonwebtoken');
const Admin = require('../model/Admin');
const Staff = require('../model/Staff');
const Warden = require('../model/Warden');
const Driver = require('../model/Driver');
const Librarian = require('../model/Librarian');

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
    let user = await Admin.findById(userId).select('_id email role staff branch client status').lean();
    
    // If Admin found and is staffAdmin, get staff details
    if (user && user.role === 'staffAdmin') {
      let staffId = user.staff;
      let staff = null;

      if (staffId) {
        staff = await Staff.findById(staffId).select('_id email name branch client status').lean();
      }

      // Fallback: try to find staff by email
      if (!staff && user.email) {
        staff = await Staff.findOne({ email: user.email }).select('_id email name branch client status').lean();
        if (staff) staffId = staff._id;
      }

      if (staff && staff.status !== false) {
        req.userId = staffId;
        req.user = {
          _id: staffId,
          userId: staffId,
          adminId: user._id,
          role: 'staff',
          branch: staff.branch,
          client: staff.client
        };
        return next();
      }
    }
    
    // If not found in Admin or not staffAdmin, try Staff model directly
    if (!user) {
      user = await Staff.findById(userId).select('_id email role branch client status').lean();
      if (user && user.status !== false) {
        req.userId = userId;
        req.user = {
          _id: userId,
          userId: userId,
          role: 'staff',
          branch: user.branch,
          client: user.client
        };
        return next();
      }
    }

    // If still not found, try Warden model
    if (!user) {
      user = await Warden.findById(userId).select('_id email status assignedHostel branch client').lean();
      if (user && user.status !== false) {
        req.userId = userId;
        req.user = {
          _id: userId,
          userId: userId,
          role: 'warden',
          branch: user.branch,
          client: user.client,
          assignedHostel: user.assignedHostel
        };
        return next();
      }
    }

    // If still not found, try Driver model (Transport Panel Support)
    if (!user) {
      user = await Driver.findById(userId).select('_id email role branch client status').lean();
      if (user && user.status !== false) {
        req.userId = userId;
        req.user = {
          _id: userId,
          userId: userId,
          role: 'driver',
          branch: user.branch,
          client: user.client
        };
        return next();
      }
    }

    // If still not found, try Librarian model
    if (!user) {
      user = await Librarian.findById(userId).select('_id email branch client status').lean();
      if (user && user.status !== false) {
        req.userId = userId;
        req.user = {
          _id: userId,
          userId: userId,
          role: 'librarian',
          branch: user.branch,
          client: user.client
        };
        return next();
      }
    }

    // If still not found, try ParentStudent model
    if (!user) {
      const ParentStudent = require('../model/ParentStudent');
      user = await ParentStudent.findById(userId).select('_id mobile branch client status role').lean();
      if (user && user.status !== false) {
        req.userId = userId;
        req.user = {
          _id: userId,
          userId: userId,
          role: user.role || 'parent',
          branch: user.branch,
          client: user.client
        };
        return next();
      }
    }

    // If Admin found but not staffAdmin and not found in other models
    if (user && user.status !== false) {
      req.userId = userId;
      req.user = {
        _id: userId,
        userId: userId,
        email: decoded.email || user.email,
        role: decoded.role || user.role,
        branch: decoded.branch || user.branch,
        client: decoded.client || user.client,
        teacher: decoded.teacher // Extract teacher ID for teacher panel users
      };
      return next();
    }

    return res.status(401).json({ message: 'User not found or session invalid' });
  } catch (error) {
    return res.status(401).json({ message: 'Authentication failed', error: error.message });
  }
};

module.exports = flexibleAuth;
