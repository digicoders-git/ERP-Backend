const express = require('express');
const router = express.Router();
const vehicleController = require('../controller/vehicleController');
const auth = require('../middleware/auth');

router.post('/create', auth, vehicleController.createVehicle);
router.get('/all', auth, vehicleController.getAllVehicles);
router.get('/transport-dashboard-stats', auth, vehicleController.getTransportDashboardStats);
router.get('/:id', auth, vehicleController.getVehicleById);
router.put('/update/:id', auth, vehicleController.updateVehicle);
router.delete('/delete/:id', auth, vehicleController.deleteVehicle);
router.patch('/toggle-status/:id', auth, vehicleController.toggleVehicleStatus);

module.exports = router;
