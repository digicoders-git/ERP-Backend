const express = require('express');
const router = express.Router();
const routeChargeController = require('../controller/routeChargeController');
const auth = require('../middleware/auth');

router.post('/add', auth, routeChargeController.addRouteCharge);
router.get('/all', auth, routeChargeController.getAllRouteCharges);
router.get('/:id', auth, routeChargeController.getRouteChargeById);
router.put('/update/:id', auth, routeChargeController.updateRouteCharge);
router.delete('/delete/:id', auth, routeChargeController.deleteRouteCharge);
router.patch('/toggle-status/:id', auth, routeChargeController.toggleRouteChargeStatus);

module.exports = router;
