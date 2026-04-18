const express = require('express');
const router = express.Router();
const driverController = require('../controller/driverController');
const flexibleAuth = require('../middleware/flexibleAuth');

router.post('/create', flexibleAuth, driverController.createDriver);
router.get('/all', flexibleAuth, driverController.getAllDrivers);
router.get('/:id', flexibleAuth, driverController.getDriverById);
router.put('/update/:id', flexibleAuth, driverController.updateDriver);
router.delete('/delete/:id', flexibleAuth, driverController.deleteDriver);
router.patch('/toggle-status/:id', flexibleAuth, driverController.toggleDriverStatus);

module.exports = router;
