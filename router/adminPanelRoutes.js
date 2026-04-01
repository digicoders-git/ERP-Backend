const express = require('express');
const router = express.Router();
const ctrl = require('../controller/adminPanelController');
const auth = require('../middleware/auth');

// Dashboard — all panels summary in one call
router.get('/dashboard', auth, ctrl.getDashboard);

// Branch detail — students + teachers + fees
router.get('/branch/:branchId', auth, ctrl.getBranchDetail);

// All panels data
router.get('/staff', auth, ctrl.getStaffData);
router.get('/teachers', auth, ctrl.getTeacherData);
router.get('/fees', auth, ctrl.getFeeData);
router.get('/transport', auth, ctrl.getTransportData);
router.get('/library', auth, ctrl.getLibraryData);
router.get('/hostel', auth, ctrl.getHostelData);
router.get('/parents', auth, ctrl.getParentData);

// Reports
router.get('/reports', auth, ctrl.getReports);

module.exports = router;
