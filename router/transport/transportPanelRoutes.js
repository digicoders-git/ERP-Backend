const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const transportPanelController = require('../../controller/transport/transportPanelController');

// Dashboard
router.get('/dashboard', auth, transportPanelController.getDashboard);
router.get('/stats', auth, transportPanelController.getStats);

// Vehicles
router.get('/vehicles', auth, transportPanelController.getVehicles);
router.get('/vehicles/:id', auth, transportPanelController.getVehicleById);

// Drivers
router.get('/drivers', auth, transportPanelController.getDrivers);
router.get('/drivers/:id', auth, transportPanelController.getDriverById);

// Routes
router.get('/routes', auth, transportPanelController.getRoutes);
router.get('/routes/:id', auth, transportPanelController.getRouteById);

// Route Stops
router.get('/route-stops/:routeId', auth, transportPanelController.getRouteStops);

// Allocations
router.get('/allocations', auth, transportPanelController.getAllocations);
router.get('/allocations/:id', auth, transportPanelController.getAllocationById);

module.exports = router;
