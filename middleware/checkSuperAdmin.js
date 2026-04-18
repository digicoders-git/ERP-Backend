const jwt = require('jsonwebtoken');
const Admin = require('../model/Admin');

const checkSuperAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role !== 'superAdmin') {
      return res.status(403).json({ message: 'Access denied. Only Super Admin can perform this action' });
    }

    const user = await Admin.findById(decoded._id).select('_id role');
    if (!user) {
      return res.status(401).json({ message: 'User no longer exists' });
    }

    req.userId = decoded._id;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = checkSuperAdmin;
