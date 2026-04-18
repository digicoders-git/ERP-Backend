const express = require('express');
const router = express.Router();
const vehicleController = require('../controller/vehicleController');
const flexibleAuth = require('../middleware/flexibleAuth');

router.post('/create', flexibleAuth, vehicleController.createVehicle);
router.get('/all', flexibleAuth, vehicleController.getAllVehicles);
router.get('/transport-dashboard-stats', flexibleAuth, vehicleController.getTransportDashboardStats);
router.get('/:id', flexibleAuth, vehicleController.getVehicleById);
router.put('/update/:id', flexibleAuth, vehicleController.updateVehicle);
router.delete('/delete/:id', flexibleAuth, vehicleController.deleteVehicle);
router.patch('/toggle-status/:id', flexibleAuth, vehicleController.toggleVehicleStatus);

module.exports = router;
