const express = require('express');
const router = express.Router();
const attendanceController = require('../controller/attendanceController');
const flexibleAuth = require('../middleware/flexibleAuth');

router.post('/mark', flexibleAuth, attendanceController.markAttendance);
router.get('/all', flexibleAuth, attendanceController.getAllAttendance);
router.get('/by-date', flexibleAuth, attendanceController.getAttendanceByDate);
router.get('/report', flexibleAuth, attendanceController.getAttendanceReport);
router.get('/students', flexibleAuth, attendanceController.getStudentsForAttendance);
router.get('/staff-list', flexibleAuth, attendanceController.getStaffForAttendance);
router.delete('/:id', flexibleAuth, attendanceController.deleteAttendance);
router.put('/update/:id', flexibleAuth, attendanceController.updateAttendance);
router.post('/biometric/sync', flexibleAuth, attendanceController.syncBiometric);
router.post('/substitute/assign', flexibleAuth, attendanceController.assignSubstitute);
router.get('/substitute/all', flexibleAuth, attendanceController.getSubstitutes);

module.exports = router;
