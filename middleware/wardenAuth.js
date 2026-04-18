const jwt = require('jsonwebtoken');
const Warden = require('../model/Warden');

const wardenAuthMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    // Use decoded.wardenId if available, or fallback to _id
    const id = decoded.wardenId || decoded._id;
    
    const warden = await Warden.findById(id).select('_id email assignedHostel status').lean();
    if (!warden) {
      return res.status(401).json({ success: false, message: 'Warden user no longer exists' });
    }

    if (warden.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Warden account is inactive' });
    }

    req.userId = warden._id.toString();
    req.user = {
      _id: warden._id.toString(),
      userId: warden._id.toString(),
      role: 'warden',
      assignedHostel: warden.assignedHostel
    };
    
    next();
  } catch (error) {
    console.error('Warden Auth Error:', error);
    return res.status(401).json({ success: false, message: 'Authentication failed', error: error.message });
  }
};

module.exports = wardenAuthMiddleware;
