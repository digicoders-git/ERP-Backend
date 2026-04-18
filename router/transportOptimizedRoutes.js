const express = require('express');
const router = express.Router();
const transportController = require('../controller/transport/transportOptimizedController');
const auth = require('../middleware/flexibleAuth');

router.get('/stats', auth, transportController.getTransportStats);
router.get('/vehicles', auth, transportController.getVehicles);
router.get('/routes', auth, transportController.getRoutes);
router.get('/drivers', auth, transportController.getDrivers);
router.get('/allocations', auth, transportController.getStudentAllocations);
router.get('/dashboard', auth, transportController.getTransportDashboard);

module.exports = router;
