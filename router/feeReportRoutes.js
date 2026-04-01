const express = require('express');
const router = express.Router();
const feeReportController = require('../controller/feeReportController');
const auth = require('../middleware/auth');

router.get('/summary', auth, feeReportController.getFeeReport);
router.get('/stats', auth, feeReportController.getFeeCollectionStats);

module.exports = router;
