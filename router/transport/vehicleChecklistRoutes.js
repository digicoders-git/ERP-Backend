const express = require('express');
const router = express.Router();
const ctrl = require('../../controller/transport/vehicleChecklistController');
const driverAuth = require('../../middleware/driverAuth');
const auth = require('../../middleware/auth');

// Driver routes
router.post('/submit', driverAuth, ctrl.submitChecklist);
router.get('/history', driverAuth, ctrl.getHistory);
router.get('/today', driverAuth, ctrl.getTodayChecklist);

// Admin route
router.get('/branch/all', auth, ctrl.getAllForBranch);

module.exports = router;
