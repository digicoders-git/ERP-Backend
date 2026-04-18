const express = require('express');
const router = express.Router();
const ctrl = require('../../controller/fee/paymentGatewayController');
const auth = require('../../middleware/auth');

// Payment order creation
router.post('/order/create', auth, ctrl.createPaymentOrder);

// Payment verification
router.post('/verify', auth, ctrl.verifyPayment);

// Manual Fee Collection (Cash/Offline)
router.post('/manual-collect', auth, ctrl.manualCollectFee);

// Payment history
router.get('/history', auth, ctrl.getPaymentHistory);

// Refund
router.post('/refund', auth, ctrl.refundPayment);

// Analytics
router.get('/analytics', auth, ctrl.getPaymentAnalytics);

// Send reminders
router.post('/reminder/send', auth, ctrl.sendPaymentReminder);

// Generate receipt
router.get('/receipt/:feeCollectionId', auth, ctrl.generateReceipt);

module.exports = router;
