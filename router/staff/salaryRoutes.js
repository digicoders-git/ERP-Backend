const express = require('express');
const router = express.Router();
const salaryController = require('../../controller/staff/salaryController');

router.get('/', salaryController.getAllSalaries);
router.get('/report', salaryController.getSalaryReport);
router.get('/:id', salaryController.getSalaryById);
router.get('/month/:month', salaryController.getSalariesByMonth);
router.get('/status/:status', salaryController.getSalariesByStatus);
router.post('/', salaryController.createSalary);
router.put('/:id', salaryController.updateSalary);
router.delete('/:id', salaryController.deleteSalary);

module.exports = router;
