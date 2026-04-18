const express = require('express');
const router = express.Router();
const ctrl = require('../../controller/transport/salaryDocumentsController');
const driverAuth = require('../../middleware/driverAuth');
const flexibleAuth = require('../../middleware/flexibleAuth');
const { upload, setStaffHeaders, cloudinaryUpload } = require('../../middleware/upload');

// Driver routes
router.get('/salary', driverAuth, ctrl.getSalaryInfo);
router.get('/documents', driverAuth, ctrl.getDocuments);

// Admin/Staff routes (flexibleAuth supports both Admin and Staff tokens)
router.post('/salary/save', flexibleAuth, ctrl.upsertSalary);
router.get('/salary/all', flexibleAuth, ctrl.getAllDriverSalaries);
router.delete('/salary/:id', flexibleAuth, ctrl.deleteSalary);
router.post('/document/save', flexibleAuth, setStaffHeaders, upload.single('file'), cloudinaryUpload, ctrl.upsertDocument);
router.get('/document/driver/:driverId', flexibleAuth, ctrl.getDriverDocuments);

module.exports = router;
