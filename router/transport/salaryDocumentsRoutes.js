const express = require('express');
const router = express.Router();
const ctrl = require('../../controller/transport/salaryDocumentsController');
const driverAuth = require('../../middleware/driverAuth');
const auth = require('../../middleware/auth');
const uploadDocument = require('../../middleware/uploadDocument');

// Driver routes
router.get('/salary', driverAuth, ctrl.getSalaryInfo);
router.get('/documents', driverAuth, ctrl.getDocuments);

// Admin routes
router.post('/salary/save', auth, ctrl.upsertSalary);
router.get('/salary/all', auth, ctrl.getAllDriverSalaries);
router.post('/document/save', auth, uploadDocument.single('file'), ctrl.upsertDocument);
router.get('/document/driver/:driverId', auth, ctrl.getDriverDocuments);

module.exports = router;
