const express = require('express');
const router = express.Router();
const feeReportsController = require('../../controller/fee/feeReportsController');
const auth = require('../../middleware/auth');

router.get('/analytics', auth, feeReportsController.getFeeAnalytics);
router.get('/payment-mode', auth, feeReportsController.getPaymentModeReport);
router.get('/monthly', auth, feeReportsController.getMonthlyCollectionReport);
router.get('/defaulters', auth, feeReportsController.getDefaulterList);

module.exports = router;
