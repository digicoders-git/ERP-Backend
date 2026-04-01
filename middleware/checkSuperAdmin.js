const checkSuperAdmin = (req, res, next) => {
  const jwt = require('jsonwebtoken');
  
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role !== 'superAdmin') {
      return res.status(403).json({ message: 'Access denied. Only Super Admin can perform this action' });
    }

    req.userId = decoded.id;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = checkSuperAdmin;
