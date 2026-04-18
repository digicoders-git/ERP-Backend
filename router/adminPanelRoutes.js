const express = require('express');
const router = express.Router();
const ctrl = require('../controller/adminPanelController');
const auth = require('../middleware/auth');

// Me — fresh allowedPanels for logged-in admin
router.get('/me', auth, ctrl.getMe);

// Dashboard — all panels summary in one call
router.get('/dashboard', auth, ctrl.getDashboard);

// Branch detail — students + teachers + fees
router.get('/branch/:branchId', auth, ctrl.getBranchDetail);

// All panels data
router.get('/staff', auth, ctrl.getStaffData);
router.get('/staff/:id', auth, ctrl.getStaffById);
router.get('/teachers', auth, ctrl.getTeacherData);
router.get('/fees', auth, ctrl.getFeeData);
router.get('/transport', auth, ctrl.getTransportData);
router.get('/library', auth, ctrl.getLibraryData);
router.get('/librarians', auth, ctrl.getLibrarianData);
router.get('/hostel', auth, ctrl.getHostelData);
router.get('/parents', auth, ctrl.getParentData);

// Reports
router.get('/reports', auth, ctrl.getReports);

// Profile
router.get('/profile', auth, ctrl.getProfile);
router.put('/profile', auth, ctrl.updateProfile);

module.exports = router;
