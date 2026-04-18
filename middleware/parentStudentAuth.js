const jwt = require('jsonwebtoken');

const parentStudentAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded._id;
    req.userRole = decoded.role;
    req.branch = decoded.branch;
    req.studentId = decoded.studentId;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = parentStudentAuth;
