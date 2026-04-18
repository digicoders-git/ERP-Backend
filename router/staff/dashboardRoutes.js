const express = require('express');
const router = express.Router();
const dashboardController = require('../../controller/staff/dashboardController');
const auth = require('../../middleware/staffAuth');

router.get('/stats', auth, dashboardController.getDashboardStats);

module.exports = router;
