const express = require('express');
const router = express.Router();
const ctrl = require('../../controller/library/barcodeFineController');
const auth = require('../../middleware/auth');

// Barcode scanning
router.post('/scan', auth, ctrl.scanBookByBarcode);
router.post('/issue', auth, ctrl.issueBookByBarcode);
router.post('/return', auth, ctrl.returnBookByBarcode);
router.post('/quick-action', auth, ctrl.quickScanAction);

// Fine management
router.get('/fines', auth, ctrl.getAllFines);
router.get('/calculate-overdue', auth, ctrl.calculateOverdueFines);
router.get('/send-notifications', auth, ctrl.sendOverdueNotifications);
router.post('/waive', auth, ctrl.waiveFine);
router.post('/collect', auth, ctrl.collectFine);
router.get('/report', auth, ctrl.getFineReport);

module.exports = router;
