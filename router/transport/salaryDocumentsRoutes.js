const express = require('express');
const router = express.Router();
const ctrl = require('../../controller/transport/salaryDocumentsController');
const driverAuth = require('../../middleware/driverAuth');
const auth = require('../../middleware/auth');

// Driver routes
router.get('/salary', driverAuth, ctrl.getSalaryInfo);
router.get('/documents', driverAuth, ctrl.getDocuments);

// Admin routes
router.post('/document/save', auth, ctrl.upsertDocument);
router.get('/document/driver/:driverId', auth, ctrl.getDriverDocuments);

module.exports = router;
