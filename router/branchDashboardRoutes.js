const express = require('express');
const router = express.Router();
const ctrl = require('../controller/branchDashboardController');
const auth = require('../middleware/auth');

router.get('/dashboard', auth, ctrl.getBranchDashboard);
router.get('/profile', auth, ctrl.getBranchProfile);

module.exports = router;
