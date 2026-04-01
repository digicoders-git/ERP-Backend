const express = require('express');
const router = express.Router();
const feeController = require('../controller/feeController');
const auth = require('../middleware/auth');

router.get('/branch-dashboard-stats', auth, feeController.getBranchDashboardStats);
router.post('/create', auth, feeController.createFee);
router.get('/all', auth, feeController.getAllFees);
router.get('/:id', auth, feeController.getFeeById);
router.put('/update/:id', auth, feeController.updateFee);
router.delete('/delete/:id', auth, feeController.deleteFee);
router.patch('/toggle-status/:id', auth, feeController.toggleFeeStatus);

module.exports = router;
