const express = require('express');
const router = express.Router();
const staffController = require('../../controller/staff/staffOptimizedController');
const flexibleAuth = require('../../middleware/flexibleAuth');

router.get('/all', flexibleAuth, staffController.getAllStaff);
router.get('/stats', flexibleAuth, staffController.getStaffStats);
router.get('/with-attendance', flexibleAuth, staffController.getStaffWithAttendance);
router.get('/leaves', flexibleAuth, staffController.getStaffLeaves);
router.get('/dashboard', flexibleAuth, staffController.getStaffDashboard);

router.post('/create', flexibleAuth, staffController.createStaff);
router.put('/update/:staffId', flexibleAuth, staffController.updateStaff);
router.delete('/delete/:staffId', flexibleAuth, staffController.deleteStaff);

module.exports = router;
