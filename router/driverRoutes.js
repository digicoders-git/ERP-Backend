const express = require('express');
const router = express.Router();
const driverController = require('../controller/driverController');
const auth = require('../middleware/auth');

router.post('/create', auth, driverController.createDriver);
router.get('/all', auth, driverController.getAllDrivers);
router.get('/:id', auth, driverController.getDriverById);
router.put('/update/:id', auth, driverController.updateDriver);
router.delete('/delete/:id', auth, driverController.deleteDriver);
router.patch('/toggle-status/:id', auth, driverController.toggleDriverStatus);

module.exports = router;
