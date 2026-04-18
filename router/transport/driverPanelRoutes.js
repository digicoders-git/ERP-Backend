const express = require('express');
const router = express.Router();
const driverPanelController = require('../../controller/transport/driverPanelController');
const driverAuth = require('../../middleware/driverAuth');
const authMiddleware = require('../../middleware/auth');

const { uploadDriver, setDriverHeaders, cloudinaryUpload } = require('../../middleware/uploadDriver');

// Public — Driver Login
router.post('/login', driverPanelController.driverLogin);

// Protected — Driver Routes
router.get('/dashboard', driverAuth, driverPanelController.getDashboardStats);
router.get('/profile', driverAuth, driverPanelController.getProfile);
router.put('/profile', driverAuth, setDriverHeaders, uploadDriver.single('profilePic'), cloudinaryUpload, driverPanelController.updateProfile);
router.get('/route-details', driverAuth, driverPanelController.getRouteDetails);
router.get('/notices', driverAuth, driverPanelController.getNotices);
router.put('/change-password', driverAuth, driverPanelController.changePassword);

// BranchAdmin — Set Driver Password
router.post('/set-password', authMiddleware, driverPanelController.setDriverPassword);

module.exports = router;
