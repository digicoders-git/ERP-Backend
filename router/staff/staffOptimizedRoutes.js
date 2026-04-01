const express = require('express');
const router = express.Router();
const staffController = require('../../controller/staff/staffOptimizedController');
const auth = require('../../middleware/auth');

router.get('/all', auth, staffController.getAllStaff);
router.get('/stats', auth, staffController.getStaffStats);
router.get('/with-attendance', auth, staffController.getStaffWithAttendance);
router.get('/leaves', auth, staffController.getStaffLeaves);
router.get('/dashboard', auth, staffController.getStaffDashboard);

router.post('/create', auth, staffController.createStaff);
router.put('/update/:staffId', auth, staffController.updateStaff);
router.delete('/delete/:staffId', auth, staffController.deleteStaff);

module.exports = router;
