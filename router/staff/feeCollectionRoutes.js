const express = require('express');
const router = express.Router();
const feeCollectionController = require('../../controller/staff/feeCollectionController');
const auth = require('../../middleware/staffAuth');

router.post('/collect', auth, feeCollectionController.collectFee);
router.get('/all', auth, feeCollectionController.getFeeCollections);
router.get('/student/:studentId', auth, feeCollectionController.getStudentFeeDetails);
router.get('/pending', auth, feeCollectionController.getPendingFees);
router.get('/receipt/:feeId', auth, feeCollectionController.generateReceipt);

module.exports = router;
