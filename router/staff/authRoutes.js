const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Staff = require('../../model/Staff');
const staffAuth = require('../../middleware/staffAuth');

// Staff Login - Simple version (for testing)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    console.log('Login attempt with email:', email);

    const staff = await Staff.findOne({ email, status: true })
      .select('_id name email password branch client')
      .lean();

    if (!staff) {
      console.log('Staff not found with email:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    console.log('Staff found:', staff._id);

    // Check password if provided, otherwise allow login (for testing)
    if (password && staff.password && staff.password !== password) {
      console.log('Password mismatch');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        _id: staff._id,
        email: staff.email,
        role: 'staff',
        branch: staff.branch,
        client: staff.client
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('Token generated successfully');

    res.status(200).json({
      success: true,
      token,
      staff: {
        _id: staff._id,
        name: staff.name,
        email: staff.email,
        branch: staff.branch,
        client: staff.client
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get current staff profile
router.get('/profile', staffAuth, async (req, res) => {
  try {
    const staff = await Staff.findById(req.userId)
      .select('_id name email mobile designation department branch client')
      .lean();

    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
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
      .select('_id name email branch client')
      .limit(10)
      .lean();

    res.status(200).json({ success: true, count: staff.length, staff });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
