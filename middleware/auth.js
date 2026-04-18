const jwt = require('jsonwebtoken');
const Admin = require('../model/Admin');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await Admin.findById(decoded._id).select('_id email role branch status');
    if (!user) {
      return res.status(401).json({ message: 'User no longer exists' });
    }

    if (!user.status) {
      return res.status(403).json({ message: 'Account is inactive' });
    }

    req.userId = decoded._id;
    req.user = {
      _id: decoded._id,
      userId: decoded._id,
      role: decoded.role,
      branch: decoded.branch || user.branch,
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
