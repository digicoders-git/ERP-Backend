const express = require('express');
const router = express.Router();
const teacherAttendanceController = require('../../controller/staff/teacherAttendanceController');

router.get('/', teacherAttendanceController.getAllAttendance);
router.get('/report', teacherAttendanceController.getAttendanceReport);
router.get('/:id', teacherAttendanceController.getAttendanceById);
router.get('/teacher/:teacherName', teacherAttendanceController.getAttendanceByTeacher);
router.get('/date/:date', teacherAttendanceController.getAttendanceByDate);
router.get('/status/:status', teacherAttendanceController.getAttendanceByStatus);
router.post('/', teacherAttendanceController.markAttendance);
router.put('/:id', teacherAttendanceController.updateAttendance);
router.delete('/:id', teacherAttendanceController.deleteAttendance);

module.exports = router;
