const express = require('express');
const router = express.Router();
const attendanceController = require('../controller/attendanceController');
const auth = require('../middleware/auth');

router.post('/mark', auth, attendanceController.markAttendance);
router.get('/all', auth, attendanceController.getAllAttendance);
router.get('/by-date', auth, attendanceController.getAttendanceByDate);
router.get('/report', auth, attendanceController.getAttendanceReport);
router.get('/students', auth, attendanceController.getStudentsForAttendance);
router.get('/staff-list', auth, attendanceController.getStaffForAttendance);

module.exports = router;
