const jwt = require('jsonwebtoken');
const Admin = require('./model/Admin');
require('dotenv').config();

const debugToken = async (token) => {
  try {
    console.log('🔍 Debugging Token...\n');
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token is valid');
    console.log('📋 Decoded:', decoded);
    console.log('⏰ Expires at:', new Date(decoded.exp * 1000));
    
    // Check if user exists
    const user = await Admin.findById(decoded._id).select('_id email role branch status');
    
    if (!user) {
      console.log('\n❌ ERROR: User not found in database');
      console.log('   User ID:', decoded._id);
      return;
    }
    
    console.log('\n✅ User found in database');
    console.log('📧 Email:', user.email);
    console.log('👤 Role:', user.role);
    console.log('🏢 Branch:', user.branch);
    console.log('📊 Status:', user.status ? 'Active' : 'Inactive');
    
    if (!user.status) {
      console.log('\n⚠️  WARNING: Account is inactive');
    }
    
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      console.log('❌ Token has expired');
      console.log('⏰ Expired at:', new Date(error.expiredAt));
    } else if (error.name === 'JsonWebTokenError') {
      console.log('❌ Invalid token:', error.message);
    } else {
      console.log('❌ Error:', error.message);
    }
  }
};

// Usage
const token = process.argv[2];
if (!token) {
  console.log('Usage: node debugToken.js <token>');
  process.exit(1);
}

debugToken(token);
