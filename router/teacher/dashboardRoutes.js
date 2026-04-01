const express = require('express');
const router = express.Router();
const dashboardController = require('../../controller/teacher/dashboardController');
const auth = require('../../middleware/auth');

// Get dashboard statistics
router.get('/stats', auth, dashboardController.getDashboardStats);

// Get teacher's classes
router.get('/classes', auth, dashboardController.getTeacherClasses);

// Get students by class
router.get('/students', auth, dashboardController.getStudentsByClass);

// Get recent activities
router.get('/recent-activities', auth, dashboardController.getRecentActivities);

// Get upcoming classes
router.get('/upcoming-classes', auth, dashboardController.getUpcomingClasses);

module.exports = router;
