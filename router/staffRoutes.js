const express = require('express');
const router = express.Router();
const staffController = require('../controller/staffController');
const authMiddleware = require('../middleware/auth');
const checkPanelAccess = require('../middleware/checkPanelAccess');
const { upload, setStaffHeaders, cloudinaryUpload } = require('../middleware/upload');

// All routes require authentication and 'staff' panel access
router.post('/create', authMiddleware, checkPanelAccess('staff'), setStaffHeaders, upload.single('profileImage'), cloudinaryUpload, staffController.createStaff);
router.get('/all', authMiddleware, checkPanelAccess('staff'), staffController.getAllStaff);
router.get('/:staffId', authMiddleware, checkPanelAccess('staff'), staffController.getStaffById);
router.put('/update/:staffId', authMiddleware, checkPanelAccess('staff'), setStaffHeaders, upload.single('profileImage'), cloudinaryUpload, staffController.updateStaff);
router.delete('/delete/:staffId', authMiddleware, checkPanelAccess('staff'), staffController.deleteStaff);
router.patch('/toggle-status/:staffId', authMiddleware, checkPanelAccess('staff'), staffController.toggleStaffStatus);

module.exports = router;
