const express = require('express');
const router = express.Router();
const feeController = require('../../controller/fee/feeOptimizedController');
const auth = require('../../middleware/auth');

router.get('/stats', auth, feeController.getFeeStats);
router.get('/pending', auth, feeController.getPendingFees);
router.get('/student-status', auth, feeController.getStudentFeeStatus);
router.get('/report', auth, feeController.getFeeReport);
router.get('/dashboard', auth, feeController.getFeeDashboard);

router.post('/record-payment', auth, feeController.recordFeePayment);

module.exports = router;
