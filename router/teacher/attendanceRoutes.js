const express = require('express');
const router = express.Router();
const attendanceController = require('../../controller/teacher/attendanceController');
const auth = require('../../middleware/auth');

// Get students by class and section
router.get('/students', auth, attendanceController.getStudentsByClass);

// Get teacher's own attendance
router.get('/teacher', auth, attendanceController.getTeacherAttendance);

// Mark attendance
router.post('/mark', auth, attendanceController.markAttendance);

// Get attendance by class
router.get('/class', auth, attendanceController.getAttendanceByClass);

// Get attendance statistics
router.get('/stats', auth, attendanceController.getAttendanceStats);

// Get student attendance history
router.get('/student/:studentId', auth, attendanceController.getStudentAttendance);

// Bulk update attendance
router.put('/bulk', auth, attendanceController.bulkUpdateAttendance);

// Get attendance report
router.get('/report', auth, attendanceController.getAttendanceReport);

module.exports = router;
