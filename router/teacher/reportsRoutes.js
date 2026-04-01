const express = require('express');
const router = express.Router();
const reportsController = require('../../controller/teacher/reportsController');
const auth = require('../../middleware/auth');

// Get academic performance report
router.get('/academic', auth, reportsController.getAcademicReport);

// Get attendance analytics
router.get('/attendance-analytics', auth, reportsController.getAttendanceAnalytics);

// Get grade distribution
router.get('/grade-distribution', auth, reportsController.getGradeDistribution);

// Get student progress
router.get('/student-progress/:studentId', auth, reportsController.getStudentProgress);

// Export report
router.get('/export', auth, reportsController.exportReport);

module.exports = router;
