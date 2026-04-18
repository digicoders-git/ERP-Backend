const express = require('express');
const router = express.Router();
const ctrl = require('../../controller/transport/transportAttendanceController');
const driverAuth = require('../../middleware/driverAuth');

// Driver routes
router.get('/today-route', driverAuth, ctrl.getTodayRoute);
router.post('/mark-attendance', driverAuth, ctrl.markAttendance);
router.get('/stop-attendance/:routeStopId', driverAuth, ctrl.getStopAttendance);
router.put('/update-stop-status', driverAuth, ctrl.updateStopStatus);
router.get('/daily-summary', driverAuth, ctrl.getDailyAttendanceSummary);

module.exports = router;
