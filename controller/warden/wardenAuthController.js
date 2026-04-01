const Warden = require('../../model/Warden');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { successResponse,  errorResponse } = require('../../responseFormatter');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES = '7d';

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return errorResponse(res, 'Email and password required', 400);

    const warden = await Warden.findOne({ email: email.toLowerCase(), status: 'active' })
      .populate('assignedHostel', 'hostelName hostelCode')
      .lean();

    if (!warden) return errorResponse(res, 'Invalid credentials', 401);

    const isMatch = await bcrypt.compare(password, warden.password);
    if (!isMatch) return errorResponse(res, 'Invalid credentials', 401);

    const token = jwt.sign(
      { _id: warden._id, email: warden.email, role: 'warden', wardenId: warden._id },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    const { password: _, ...wardenData } = warden;
    return successResponse(res, { token, warden: wardenData }, 'Login successful');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.getProfile = async (req, res) => {
  try {
    const warden = await Warden.findById(req.userId)
      .select('-password')
      .populate('assignedHostel', 'hostelName hostelCode')
      .lean();
    if (!warden) return errorResponse(res, 'Warden not found', 404);
    return successResponse(res, warden, 'Profile fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return errorResponse(res, 'Both passwords required', 400);
    if (newPassword.length < 8) return errorResponse(res, 'New password must be at least 8 characters', 400);

    const warden = await Warden.findById(req.userId);
    if (!warden) return errorResponse(res, 'Warden not found', 404);

    const isMatch = await bcrypt.compare(currentPassword, warden.password);
    if (!isMatch) return errorResponse(res, 'Current password is incorrect', 400);

    warden.password = await bcrypt.hash(newPassword, 10);
    await warden.save();

    return successResponse(res, null, 'Password changed successfully');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.logout = async (req, res) => {
  // JWT is stateless - client deletes token
  return successResponse(res, null, 'Logged out successfully');
};
