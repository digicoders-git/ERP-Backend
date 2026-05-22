const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Staff = require('../../model/Staff');
const Admin = require('../../model/Admin');
const staffAuth = require('../../middleware/staffAuth');

// Staff Login (with Branch Admin Fallback)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    console.log('=== LOGIN ATTEMPT ===');
    console.log('Email:', email);

    // 1. Try finding in Staff model first
    let staff = await Staff.findOne({ email, status: true })
      .select('_id name email password branch client designation')
      .lean();

    let isBranchAdmin = false;
    let admin = null;

    if (!staff) {
      console.log('Staff not found, searching in Admin model for branchAdmin fallback');
      
      // 2. Fallback to Admin model for role branchAdmin
      admin = await Admin.findOne({ email, role: 'branchAdmin', status: true })
        .select('_id name email password branch client')
        .lean();

      if (!admin) {
        console.log('User not found in either Staff or Admin models');
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Admin passwords are hashed with bcrypt
      const isPasswordMatch = await bcrypt.compare(password, admin.password);
      console.log('Admin password match:', isPasswordMatch);

      if (!isPasswordMatch) {
        console.log('Admin password mismatch');
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      isBranchAdmin = true;
    } else {
      console.log('Staff found in DB');
      // Staff passwords are plain text (or direct match)
      if (password !== staff.password) {
        console.log('Staff password mismatch');
        return res.status(401).json({ message: 'Invalid credentials' });
      }
    }

    console.log('Authentication successful, generating token...');

    // Generate JWT token
    const tokenPayload = isBranchAdmin ? {
      _id: admin._id,
      email: admin.email,
      role: 'branchAdmin',
      branch: admin.branch,
      client: admin.client
    } : {
      _id: staff._id,
      email: staff.email,
      role: 'staff',
      branch: staff.branch,
      client: staff.client
    };

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    console.log('Token generated successfully for role:', tokenPayload.role);

    const userResponse = isBranchAdmin ? {
      _id: admin._id,
      name: admin.name || 'Branch Admin',
      email: admin.email,
      branch: admin.branch,
      client: admin.client,
      designation: 'Branch Admin',
      role: 'branchAdmin'
    } : {
      _id: staff._id,
      name: staff.name,
      email: staff.email,
      branch: staff.branch,
      client: staff.client,
      designation: staff.designation,
      role: 'staff'
    };

    res.status(200).json({
      success: true,
      token,
      staff: userResponse
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get current staff profile (with Branch Admin Fallback)
router.get('/profile', staffAuth, async (req, res) => {
  try {
    let staff = await Staff.findById(req.userId)
      .select('_id name email mobile designation department branch client profileImage')
      .lean();

    if (!staff) {
      console.log('Profile lookup failed for Staff ID, checking Admin model fallback:', req.userId);
      
      const admin = await Admin.findById(req.userId)
        .select('_id name email mobile branch client profileImage role')
        .lean();

      if (admin && admin.role === 'branchAdmin') {
        staff = {
          _id: admin._id,
          name: admin.name || 'Branch Admin',
          email: admin.email,
          mobile: admin.mobile || '',
          designation: 'Branch Admin',
          department: 'Administration',
          branch: admin.branch,
          client: admin.client,
          profileImage: admin.profileImage,
          role: 'branchAdmin'
        };
      }
    }

    if (!staff) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    res.status(200).json({ success: true, data: staff });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Debug: Get all staff (for testing)
router.get('/debug/all-staff', async (req, res) => {
  try {
    const staff = await Staff.find({ status: true })
      .select('_id name email branch client designation password')
      .limit(10)
      .lean();

    res.status(200).json({ success: true, count: staff.length, staff });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
