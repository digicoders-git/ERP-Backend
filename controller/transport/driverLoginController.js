const Driver = require('../../model/Driver');
const jwt = require('jsonwebtoken');

// Driver Login
exports.driverLogin = async (req, res) => {
  try {
    console.log('\n=== DRIVER LOGIN REQUEST ===');
    console.log('Email:', req.body.email);
    console.log('Password length:', req.body.password?.length);
    
    const { email, password } = req.body;

    if (!email || !password) {
      console.log('❌ Missing email or password');
      return res.status(400).json({ 
        success: false,
        message: 'Email and password are required' 
      });
    }

    console.log('Finding driver with email:', email);
    // Find driver with password field
    const driver = await Driver.findOne({ email: email.toLowerCase() })
      .select('+password')
      .populate('branch', 'branchName branchCode')
      .populate('client', 'name');

    console.log('Driver found:', !!driver);
    if (!driver) {
      console.log('❌ Driver not found');
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password' 
      });
    }

    console.log('Driver name:', driver.name);
    console.log('Driver status:', driver.status);
    console.log('Driver has password:', !!driver.password);

    if (!driver.status) {
      console.log('❌ Driver account is inactive');
      return res.status(403).json({ 
        success: false,
        message: 'Your account is inactive. Please contact administrator.' 
      });
    }

    if (!driver.password) {
      console.log('❌ Driver password not set');
      return res.status(403).json({ 
        success: false,
        message: 'Password not set. Please contact administrator.' 
      });
    }

    console.log('Comparing passwords...');
    // Compare password
    const isMatch = await driver.comparePassword(password);
    console.log('Password match:', isMatch);
    
    if (!isMatch) {
      console.log('❌ Password does not match');
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password' 
      });
    }

    console.log('✅ Password matched');
    console.log('Generating JWT token...');
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        id: driver._id, 
        email: driver.email, 
        role: 'driver',
        branch: driver.branch?._id,
        client: driver.client?._id
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ Token generated');
    console.log('Token preview:', token.substring(0, 20) + '...');

    const responseData = {
      success: true,
      message: 'Login successful',
      token,
      driver: {
        id: driver._id,
        name: driver.name,
        email: driver.email,
        mobileNo: driver.mobileNo,
        licenseNo: driver.licenseNo,
        licenseExpiryDate: driver.licenseExpiryDate,
        experience: driver.experience,
        address: driver.address,
        status: driver.status,
        branch: driver.branch,
        client: driver.client,
        role: 'driver'
      }
    };

    console.log('✅ Sending response');
    console.log('Response:', JSON.stringify(responseData, null, 2));
    
    res.status(200).json(responseData);
    
  } catch (error) {
    console.error('\n=== LOGIN ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// Get Driver Profile
exports.getDriverProfile = async (req, res) => {
  try {
    console.log('\n=== GET DRIVER PROFILE ===');
    console.log('User ID:', req.userId);
    
    const driver = await Driver.findById(req.userId)
      .populate('branch', 'branchName branchCode')
      .populate('client', 'name');

    if (!driver) {
      console.log('❌ Driver not found');
      return res.status(404).json({ 
        success: false,
        message: 'Driver not found' 
      });
    }

    console.log('✅ Driver found:', driver.name);

    res.status(200).json({
      success: true,
      driver: {
        id: driver._id,
        name: driver.name,
        email: driver.email,
        mobileNo: driver.mobileNo,
        licenseNo: driver.licenseNo,
        licenseExpiryDate: driver.licenseExpiryDate,
        experience: driver.experience,
        address: driver.address,
        status: driver.status,
        branch: driver.branch,
        client: driver.client,
        role: 'driver'
      }
    });
  } catch (error) {
    console.error('\n=== PROFILE ERROR ===');
    console.error('Error:', error.message);
    
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};
