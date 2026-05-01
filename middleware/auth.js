const jwt = require('jsonwebtoken');
const Admin = require('../model/Admin');
const Driver = require('../model/Driver');
const Warden = require('../model/Warden');
const Librarian = require('../model/Librarian');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded._id || decoded.id;

    let user = null;
    const role = decoded.role;

    if (role === 'driver') {
      user = await Driver.findById(userId).select('_id email status branch client');
    } else if (role === 'warden') {
      user = await Warden.findById(userId).select('_id email status branch client');
    } else if (role === 'librarian') {
      user = await Librarian.findById(userId).select('_id email status branch client');
    } else {
      user = await Admin.findById(userId).select('_id email role branch client allowedPanels status');
    }

    if (!user) {
      return res.status(401).json({ message: 'User no longer exists' });
    }

    const userStatus = user.status === true || user.status === 'active' || user.status === 'Active';
    if (!userStatus) {
      return res.status(403).json({ message: 'Account is inactive' });
    }

    req.userId = userId;
    req.user = {
      _id: userId,
      userId: userId,
      role: role || user.role,
      branch: user.branch,
      client: user.client,
      allowedPanels: user.allowedPanels || [],
      teacher: decoded.teacher
    };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    return res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = authMiddleware;
