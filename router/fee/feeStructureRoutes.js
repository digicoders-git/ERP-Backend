const express = require('express');
const router = express.Router();
const feeStructureController = require('../../controller/fee/feeStructureController');
const auth = require('../../middleware/auth');

router.post('/add', auth, feeStructureController.createFeeStructure);
router.get('/all', auth, feeStructureController.getAllFeeStructures);
router.get('/:id', auth, feeStructureController.getFeeStructureById);
router.get('/class/:classId', auth, feeStructureController.getFeeStructureByClass);
router.put('/:id', auth, feeStructureController.updateFeeStructure);
router.delete('/:id', auth, feeStructureController.deleteFeeStructure);

module.exports = router;
