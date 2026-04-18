const express = require('express');
const router = express.Router();
const dashboardController = require('../../controller/library/libraryDashboardController');
const auth = require('../../middleware/auth');

router.get('/stats', auth, dashboardController.getDashboardStats);
router.get('/recent-activities', auth, dashboardController.getRecentActivities);
router.get('/overdue-books', auth, dashboardController.getOverdueBooks);
router.get('/popular-books', auth, dashboardController.getPopularBooks);

module.exports = router;
