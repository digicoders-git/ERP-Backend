const express = require('express');
const router = express.Router();
const feeAdminController = require('../../controller/staff/feeAdminController');
const flexibleAuth = require('../../middleware/flexibleAuth');

router.get('/', flexibleAuth, feeAdminController.getAllFeeAdmins);
router.post('/', flexibleAuth, feeAdminController.createFeeAdmin);
router.put('/:id', flexibleAuth, feeAdminController.updateFeeAdmin);
router.delete('/:id', flexibleAuth, feeAdminController.deleteFeeAdmin);

module.exports = router;
