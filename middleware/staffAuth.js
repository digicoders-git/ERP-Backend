const jwt = require('jsonwebtoken');
const Admin = require('../model/Admin');
const Staff = require('../model/Staff');

const staffAuthMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || req.query.token;
    
    if (!token) {
      console.log('No token provided in headers or query');
      return res.status(401).json({ message: 'No token provided' });
    }

    console.log('Verifying token...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    console.log('Token decoded:', decoded);

    let staffId = decoded._id;
    let staff = null;

    // If token has role 'staff', search directly in Staff model
    if (decoded.role === 'staff') {
      console.log('Token is staff role, searching in Staff model');
      staff = await Staff.findById(decoded._id).select('_id email name branch client status');
      
      if (!staff) {
        console.log('Staff not found:', decoded._id);
        return res.status(401).json({ message: 'Staff member no longer exists' });
      }

      if (!staff.status) {
        console.log('Staff is inactive:', decoded._id);
        return res.status(403).json({ message: 'Staff account is inactive' });
      }

      console.log('Staff authenticated:', staff._id);

      req.userId = staffId;
      req.user = {
        _id: staffId,
        userId: staffId,
        email: staff.email,
        name: staff.name,
        role: 'staff',
        branch: staff.branch,
        client: staff.client
      };
      
      return next();
    }

    // If token has role 'staffAdmin', search in Admin model
    if (decoded.role === 'staffAdmin') {
      console.log('Token is staffAdmin role, searching in Admin model');
      const admin = await Admin.findById(decoded._id)
        .select('_id email role staff branch client status')
        .populate('staff', '_id email name branch client status');
      
      if (!admin) {
        console.log('Admin not found:', decoded._id);
        return res.status(401).json({ message: 'User not found' });
      }

      if (admin.role !== 'staffAdmin') {
        console.log('Not a staff admin:', decoded._id);
        return res.status(403).json({ message: 'Access denied. Only staff admins can access this panel.' });
      }

      if (!admin.status) {
        console.log('Admin is inactive:', decoded._id);
        return res.status(403).json({ message: 'Account is inactive' });
      }

      // Get staff details from the staff reference
      staffId = admin.staff?._id;
      staff = admin.staff;

      // Fallback 1: If staff reference is not populated, try to find by email
      if (!staff && admin.email) {
        console.log('Staff reference not populated, searching by email:', admin.email);
        staff = await Staff.findOne({ email: admin.email }).select('_id email name branch client status');
        if (staff) {
          staffId = staff._id;
          console.log('Found staff by email:', staffId);
        }
      }

      // Fallback 2: If still not found, use admin data as staff context
      if (!staff) {
        console.log('Staff not found, using admin context');
        staffId = admin._id;
        staff = {
          _id: admin._id,
          email: admin.email,
          branch: admin.branch,
          client: admin.client,
          status: admin.status
        };
      }

      if (!staff || !staffId) {
        console.log('Staff member not found for admin:', decoded._id);
        return res.status(401).json({ message: 'Staff member no longer exists' });
      }

      if (staff.status === false) {
        console.log('Staff is inactive:', staffId);
        return res.status(403).json({ message: 'Staff account is inactive' });
      }

      console.log('Staff authenticated:', staffId);

      req.userId = staffId;
      req.user = {
        _id: staffId,
        userId: staffId,
        adminId: admin._id,
        email: staff.email || admin.email,
        name: staff.name,
        role: 'staff',
        branch: staff.branch || admin.branch,
        client: staff.client || admin.client
      };
      
      return next();
    }

    // If role is neither staff nor staffAdmin
    console.log('Invalid role:', decoded.role);
    return res.status(403).json({ message: 'Invalid role for staff panel access' });

  } catch (error) {
    console.error('Auth middleware error:', error.message);
    return res.status(401).json({ message: 'Invalid token', error: error.message });
  }
};

module.exports = staffAuthMiddleware;
