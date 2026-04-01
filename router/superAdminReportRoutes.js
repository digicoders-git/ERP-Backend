const express = require('express');
const router = express.Router();
const reportController = require('../controller/superAdminReportController');
const checkSuperAdmin = require('../middleware/checkSuperAdmin');

// All routes are protected and only accessible by Super Admin
router.get('/clients', checkSuperAdmin, reportController.getClientsReport);
router.get('/plans', checkSuperAdmin, reportController.getPlansReport);
router.get('/revenue', checkSuperAdmin, reportController.getRevenueReport);
router.get('/system-overview', checkSuperAdmin, reportController.getSystemOverview);
router.get('/growth-analytics', checkSuperAdmin, reportController.getGrowthAnalytics);

module.exports = router;
