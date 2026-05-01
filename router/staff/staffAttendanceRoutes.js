const express = require('express');
const router = express.Router();
const staffAttendanceController = require('../../controller/staff/staffAttendanceController');
const flexibleAuth = require('../../middleware/flexibleAuth');

router.use(flexibleAuth);

// Admin/Staff Panel operations
router.get('/list', staffAttendanceController.getStaffList);
router.post('/mark', staffAttendanceController.markStaffAttendance);

// Personal history (for any staff panel)
router.get('/my-history', staffAttendanceController.getOwnAttendanceHistory);

module.exports = router;
