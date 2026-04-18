const express = require('express');
const router = express.Router();
const studentController = require('../controller/studentOptimizedController');
const auth = require('../middleware/flexibleAuth');

router.get('/stats', auth, studentController.getStudentStats);
router.get('/all', auth, studentController.getStudents);
router.get('/with-attendance', auth, studentController.getStudentWithAttendance);
router.get('/fee-status', auth, studentController.getStudentFeeStatus);
router.get('/dashboard', auth, studentController.getStudentDashboard);

module.exports = router;
