const jwt = require('jsonwebtoken');
const Staff = require('../model/Staff');

const staffAuthMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const staff = await Staff.findById(decoded._id).select('_id email branch client');
    if (!staff) {
      return res.status(401).json({ message: 'Staff member no longer exists' });
    }

    req.userId = decoded._id;
    req.user = {
      _id: decoded._id,
      userId: decoded._id,
      role: 'staff',
      branch: staff.branch,
      client: staff.client
    };
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = staffAuthMiddleware;
