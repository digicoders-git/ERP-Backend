const express = require('express');
const router = express.Router();
const feeReportController = require('../controller/feeReportController');
const flexibleAuth = require('../middleware/flexibleAuth');

router.get('/summary', flexibleAuth, feeReportController.getFeeReport);
router.get('/stats', flexibleAuth, feeReportController.getFeeCollectionStats);

module.exports = router;
