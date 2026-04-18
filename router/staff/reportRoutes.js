const express = require('express');
const router = express.Router();
const reportController = require('../../controller/staff/reportController');
const auth = require('../../middleware/staffAuth');

router.get('/overview', auth, reportController.getOverviewStats);
router.get('/hostel/dashboard', auth, reportController.getHostelDashboard);
router.get('/hostel/report', auth, reportController.getHostelReport);
router.get('/transport/dashboard', auth, reportController.getTransportDashboard);
router.get('/transport/report', auth, reportController.getTransportReport);
router.get('/attendance', auth, reportController.getAttendanceReport);

module.exports = router;
