require('dotenv').config();
const jwt = require('jsonwebtoken');

const driverAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Robust driverId extraction (supports both 'id' and '_id')
    const driverId = decoded.id || decoded._id;
    
    console.log('--- Driver Auth Debug ---');
    console.log('Decoded ID:', driverId);
    console.log('Decoded Role:', decoded.role);

    if (decoded.role !== 'driver') {
      console.warn('❌ Access Denied: Role mismatch. Required: driver, Found:', decoded.role);
      return res.status(403).json({ message: 'Access denied. Driver only' });
    }

    if (!driverId) {
      console.error('❌ Access Denied: No valid ID found in token');
      return res.status(401).json({ message: 'Invalid token structure' });
    }

    req.driverId = driverId;
    console.log('✅ Auth Success. Driver ID:', req.driverId);
    next();
  } catch (error) {
    console.error('❌ Driver Auth Error:', error.message);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired. Please login again' });
    }
    return res.status(401).json({ message: 'Authentication failed' });
  }
};

module.exports = driverAuth;
