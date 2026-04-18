const express = require('express');
const router = express.Router();
const driverSalaryController = require('../controller/driverSalaryController');

router.get('/', driverSalaryController.getAllDriverSalaries);
router.get('/report', driverSalaryController.getDriverSalaryReport);
router.get('/drivers-list', driverSalaryController.getDriversForSalary);
router.get('/:id', driverSalaryController.getDriverSalaryById);
router.get('/month/:month', driverSalaryController.getDriverSalariesByMonth);
router.get('/status/:status', driverSalaryController.getDriverSalariesByStatus);
router.post('/', driverSalaryController.createDriverSalary);
router.put('/:id', driverSalaryController.updateDriverSalary);
router.delete('/:id', driverSalaryController.deleteDriverSalary);

module.exports = router;
