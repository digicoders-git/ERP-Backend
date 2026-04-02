const Driver = require('../../model/Driver');
const Vehicle = require('../../model/Vehicle');
const Route = require('../../model/Route');
const RouteStop = require('../../model/RouteStop');
const TransportAssignment = require('../../model/TransportAssignment');
const TransportAllocation = require('../../model/TransportAllocation');
const Notice = require('../../model/Notice');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Driver Login
exports.driverLogin = async (req, res) => {
  try {
    const { mobileNo, password } = req.body;

    if (!mobileNo || !password) {
      return res.status(400).json({ message: 'Mobile number and password are required' });
    }

    const driver = await Driver.findOne({ mobileNo })
      .select('+password')
      .populate('branch', 'branchName branchCode')
      .populate('client', 'name');

    if (!driver) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!driver.status) {
      return res.status(403).json({ message: 'Account is inactive. Contact admin' });
    }

    if (!driver.password) {
      return res.status(401).json({ message: 'Password not set. Contact admin' });
    }

    const isMatch = await bcrypt.compare(password, driver.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: driver._id, role: 'driver' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      driver: {
        id: driver._id,
        name: driver.name,
        mobileNo: driver.mobileNo,
        licenseNo: driver.licenseNo,
        licenseExpiryDate: driver.licenseExpiryDate,
        experience: driver.experience,
        branch: driver.branch,
        status: driver.status
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Driver Dashboard Stats
exports.getDashboardStats = async (req, res) => {
  try {
    const driver = await Driver.findById(req.driverId)
      .populate('branch', 'branchName branchCode');

    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    const assignment = await TransportAssignment.findOne({ driver: req.driverId, status: true })
      .populate('vehicle', 'vehicleNo vehicleType vehicleCapacity')
      .populate('route', 'routeName routeCode startPoint endPoint totalDistance');

    let totalStudents = 0;
    let totalStops = 0;
    let routeStops = [];

    if (assignment) {
      routeStops = await RouteStop.find({ route: assignment.route._id }).sort({ stopOrder: 1 });
      totalStops = routeStops.length;
      totalStudents = await TransportAllocation.countDocuments({
        route: assignment.route._id,
        status: true
      });
    }

    res.status(200).json({
      driver: {
        name: driver.name,
        mobileNo: driver.mobileNo,
        licenseNo: driver.licenseNo,
        licenseExpiryDate: driver.licenseExpiryDate,
        experience: driver.experience,
        branch: driver.branch
      },
      assignment,
      stats: { totalStudents, totalStops },
      routeStops
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Driver Profile
exports.getProfile = async (req, res) => {
  try {
    const driver = await Driver.findById(req.driverId)
      .populate('branch', 'branchName branchCode address phone')
      .select('-password');

    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    const assignment = await TransportAssignment.findOne({ driver: req.driverId, status: true })
      .populate('vehicle', 'vehicleNo vehicleType vehicleCapacity')
      .populate('route', 'routeName routeCode startPoint endPoint');

    res.status(200).json({ driver, assignment });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Route Details with Students
exports.getRouteDetails = async (req, res) => {
  try {
    const assignment = await TransportAssignment.findOne({ driver: req.driverId, status: true })
      .populate('vehicle', 'vehicleNo vehicleType vehicleCapacity rcNo')
      .populate('route', 'routeName routeCode startPoint endPoint totalDistance');

    if (!assignment) {
      return res.status(404).json({ message: 'No active assignment found' });
    }

    const routeStops = await RouteStop.find({ route: assignment.route._id }).sort({ stopOrder: 1 });

    const students = await TransportAllocation.find({
      route: assignment.route._id,
      status: true
    }).populate('routeStop', 'stopName stopOrder pickupTime dropTime');

    res.status(200).json({ assignment, routeStops, students });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Notices for Driver
exports.getNotices = async (req, res) => {
  try {
    const driver = await Driver.findById(req.driverId);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    const notices = await Notice.find({
      branch: driver.branch,
      isPublished: true
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('title type priority content publishDate expiryDate');

    res.status(200).json({ notices });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Change Password
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Old password and new password are required' });
    }

    const driver = await Driver.findById(req.driverId).select('+password');
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    const isMatch = await bcrypt.compare(oldPassword, driver.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Old password is incorrect' });
    }

    await Driver.findByIdAndUpdate(req.driverId, { password: await bcrypt.hash(newPassword, 10) });

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Set Driver Password (by BranchAdmin)
exports.setDriverPassword = async (req, res) => {
  try {
    const { driverId, password } = req.body;

    if (!driverId || !password) {
      return res.status(400).json({ message: 'Driver ID and password are required' });
    }

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    driver.password = await bcrypt.hash(password, 10);
    await driver.save();

    res.status(200).json({ message: 'Driver password set successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
