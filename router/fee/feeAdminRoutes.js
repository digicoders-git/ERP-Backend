const express = require('express');
const router = express.Router();
const feeAdminController = require('../../controller/fee/feeAdminController');
const auth = require('../../middleware/auth');

// Authentication Routes
router.post('/login', feeAdminController.login);
router.get('/profile', auth, feeAdminController.getProfile);
router.put('/profile', auth, feeAdminController.updateProfile);
router.put('/change-password', auth, feeAdminController.changePassword);

// Fee Admin Management Routes
router.post('/add', auth, feeAdminController.createFeeAdmin);
router.get('/all', auth, feeAdminController.getAllFeeAdmins);
router.delete('/:id', auth, feeAdminController.deleteFeeAdmin);

module.exports = router;
