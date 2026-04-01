const express = require('express');
const router = express.Router();
const ctrl = require('../../controller/transport/gpsTrackingController');
const driverAuth = require('../../middleware/driverAuth');
const auth = require('../../middleware/auth');

// Driver APIs (requires driver authentication)
router.post('/location/update', driverAuth, ctrl.updateLocation);
router.get('/driver/dashboard', driverAuth, ctrl.getDriverDashboard);

// Admin/Parent APIs (requires authentication)
router.get('/location/vehicle/:vehicleId', auth, ctrl.getVehicleLocation);
router.get('/location/all', auth, ctrl.getAllVehiclesLocation);
router.get('/track/student/:studentId', auth, ctrl.trackStudentVehicle);
router.get('/route/optimize/:routeId', auth, ctrl.optimizeRoute);
router.get('/trip/history/:vehicleId', auth, ctrl.getTripHistory);
router.post('/geofence/check', auth, ctrl.checkGeofence);

module.exports = router;
