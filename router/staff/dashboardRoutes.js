const express = require('express');
const router = express.Router();
const dashboardController = require('../../controller/staff/dashboardController');
const auth = require('../../middleware/auth');

router.get('/stats', auth, dashboardController.getDashboardStats);

module.exports = router;
