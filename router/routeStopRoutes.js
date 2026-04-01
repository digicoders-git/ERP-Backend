const express = require('express');
const router = express.Router();
const routeStopController = require('../controller/routeStopController');
const auth = require('../middleware/auth');

router.post('/add', auth, routeStopController.addRouteStops);
router.get('/all', auth, routeStopController.getAllRouteStops);
router.get('/:id', auth, routeStopController.getRouteStopById);
router.put('/update/:id', auth, routeStopController.updateRouteStop);
router.delete('/delete/:id', auth, routeStopController.deleteRouteStop);

module.exports = router;
