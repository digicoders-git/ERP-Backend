const express = require('express');
const router = express.Router();
const routeController = require('../controller/routeController');
const flexibleAuth = require('../middleware/flexibleAuth');

router.post('/create', flexibleAuth, routeController.createRoute);
router.get('/all', flexibleAuth, routeController.getAllRoutes);
router.get('/:id', flexibleAuth, routeController.getRouteById);
router.put('/update/:id', flexibleAuth, routeController.updateRoute);
router.delete('/delete/:id', flexibleAuth, routeController.deleteRoute);
router.patch('/toggle-status/:id', flexibleAuth, routeController.toggleRouteStatus);

module.exports = router;
