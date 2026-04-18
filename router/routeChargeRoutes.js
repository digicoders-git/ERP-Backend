const express = require('express');
const router = express.Router();
const routeChargeController = require('../controller/routeChargeController');
const flexibleAuth = require('../middleware/flexibleAuth');

router.post('/add', flexibleAuth, routeChargeController.addRouteCharge);
router.get('/all', flexibleAuth, routeChargeController.getAllRouteCharges);
router.get('/:id', flexibleAuth, routeChargeController.getRouteChargeById);
router.put('/update/:id', flexibleAuth, routeChargeController.updateRouteCharge);
router.delete('/delete/:id', flexibleAuth, routeChargeController.deleteRouteCharge);
router.patch('/toggle-status/:id', flexibleAuth, routeChargeController.toggleRouteChargeStatus);

module.exports = router;
