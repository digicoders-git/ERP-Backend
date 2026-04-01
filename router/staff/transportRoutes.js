const express = require('express');
const router = express.Router();
const t = require('../../controller/staff/transportController');
const auth = require('../../middleware/auth');

// Vehicle
router.get('/vehicles', auth, t.getAllVehicles);
router.post('/vehicles', auth, t.createVehicle);
router.put('/vehicles/:id', auth, t.updateVehicle);
router.delete('/vehicles/:id', auth, t.deleteVehicle);

// Driver
router.get('/drivers', auth, t.getAllDrivers);
router.post('/drivers', auth, t.createDriver);
router.put('/drivers/:id', auth, t.updateDriver);
router.delete('/drivers/:id', auth, t.deleteDriver);

// Route
router.get('/routes', auth, t.getAllRoutes);
router.post('/routes', auth, t.createRoute);
router.put('/routes/:id', auth, t.updateRoute);
router.delete('/routes/:id', auth, t.deleteRoute);

// Route Stop
router.get('/route-stops', auth, t.getAllRouteStops);
router.post('/route-stops', auth, t.createRouteStop);
router.put('/route-stops/:id', auth, t.updateRouteStop);
router.delete('/route-stops/:id', auth, t.deleteRouteStop);

// Route Charge
router.get('/route-charges', auth, t.getAllRouteCharges);
router.post('/route-charges', auth, t.createRouteCharge);
router.put('/route-charges/:id', auth, t.updateRouteCharge);
router.delete('/route-charges/:id', auth, t.deleteRouteCharge);

// Transport Allocation
router.get('/allocations', auth, t.getAllTransportAllocations);
router.post('/allocations', auth, t.createTransportAllocation);
router.put('/allocations/:id', auth, t.updateTransportAllocation);
router.delete('/allocations/:id', auth, t.deleteTransportAllocation);

module.exports = router;
