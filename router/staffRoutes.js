const express = require('express');
const router = express.Router();
const staffController = require('../controller/staffController');
const authMiddleware = require('../middleware/auth');
const { upload, setStaffHeaders, cloudinaryUpload } = require('../middleware/upload');

// All routes require authentication
router.post('/create', authMiddleware, setStaffHeaders, upload.single('profileImage'), cloudinaryUpload, staffController.createStaff);
router.get('/all', authMiddleware, staffController.getAllStaff);
router.get('/:staffId', authMiddleware, staffController.getStaffById);
router.put('/update/:staffId', authMiddleware, setStaffHeaders, upload.single('profileImage'), cloudinaryUpload, staffController.updateStaff);
router.delete('/delete/:staffId', authMiddleware, staffController.deleteStaff);
router.patch('/toggle-status/:staffId', authMiddleware, staffController.toggleStaffStatus);

module.exports = router;
