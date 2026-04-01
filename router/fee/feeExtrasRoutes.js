const express = require('express');
const router = express.Router();
const ctrl = require('../../controller/fee/feeExtrasController');
const auth = require('../../middleware/auth');

// Receipts
router.get('/receipts', auth, ctrl.getReceipts);

// Hostel & Library Fees
router.get('/hostel-library', auth, ctrl.getHostelLibraryFees);
router.post('/hostel-library', auth, ctrl.createHostelLibraryFee);
router.put('/hostel-library/:id', auth, ctrl.updateHostelLibraryFee);
router.delete('/hostel-library/:id', auth, ctrl.deleteHostelLibraryFee);

// Payment Options
router.get('/payment-options', auth, ctrl.getPaymentOptions);
router.post('/payment-options', auth, ctrl.createPaymentOption);
router.put('/payment-options/:id', auth, ctrl.updatePaymentOption);
router.delete('/payment-options/:id', auth, ctrl.deletePaymentOption);

// Scholarship & Discount
router.get('/scholarship', auth, ctrl.getScholarships);
router.post('/scholarship', auth, ctrl.createScholarship);
router.put('/scholarship/:id', auth, ctrl.updateScholarship);
router.delete('/scholarship/:id', auth, ctrl.deleteScholarship);

// Pending Alerts
router.get('/pending-alerts', auth, ctrl.getPendingAlerts);

// Settings
router.get('/settings', auth, ctrl.getSettings);
router.put('/settings', auth, ctrl.saveSettings);

module.exports = router;
