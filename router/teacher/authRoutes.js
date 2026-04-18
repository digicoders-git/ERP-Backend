const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const Admin = require('../../model/Admin');
const jwt = require('jsonwebtoken');

// Teacher Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    // Find teacher admin
    const admin = await Admin.findOne({ email, role: 'teacherAdmin' }).populate('teacher').populate('branch');
    
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Check password
    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Generate token
    const token = jwt.sign(
      { _id: admin._id, userId: admin._id, role: admin.role, branch: admin.branch, teacher: admin.teacher._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      teacher: {
        id: admin.teacher?._id,
        name: admin.teacher?.name,
        email: admin.teacher?.email,
        mobile: admin.teacher?.mobile,
        profileImage: admin.teacher?.profileImage,
        branch: admin.branch
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Get Teacher Profile
router.get('/profile', auth, async (req, res) => {
  try {
    const admin = await Admin.findById(req.userId).select('-password');
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }
    res.status(200).json({ success: true, data: admin });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
