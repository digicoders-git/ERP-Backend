const express = require('express');
const router = express.Router();
const routeStopController = require('../controller/routeStopController');
const flexibleAuth = require('../middleware/flexibleAuth');

console.log('✅ RouteStop routes loading...');

router.post('/add', flexibleAuth, routeStopController.addRouteStops);
router.get('/all', flexibleAuth, routeStopController.getAllRouteStops);
router.get('/route/:routeId', flexibleAuth, routeStopController.getRouteStopsByRoute);
router.get('/:id', flexibleAuth, routeStopController.getRouteStopById);
router.put('/update/:id', flexibleAuth, routeStopController.updateRouteStop);
router.delete('/delete/:id', flexibleAuth, routeStopController.deleteRouteStop);

console.log('✅ RouteStop routes loaded successfully');

module.exports = router;
