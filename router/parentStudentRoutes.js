const express = require('express');
const router = express.Router();
const ctrl = require('../controller/parentStudentController');
const psAuth = require('../middleware/parentStudentAuth');
const auth = require('../middleware/auth');

// Public
router.post('/login', ctrl.login);

// Protected — student/parent/warden
router.get('/dashboard', psAuth, ctrl.getDashboard);
router.get('/timetable', psAuth, ctrl.getTimetable);
router.get('/fee', psAuth, ctrl.getFee);
router.get('/assignments', psAuth, ctrl.getAssignments);
router.get('/notices', psAuth, ctrl.getNotices);
router.get('/library', psAuth, ctrl.getLibrary);
router.get('/hostel', psAuth, ctrl.getHostel);
router.get('/live-classes', psAuth, ctrl.getLiveClasses);
router.get('/recorded-classes', psAuth, ctrl.getRecordedClasses);
router.get('/ediary', psAuth, ctrl.getEDiary);
router.put('/change-password', psAuth, ctrl.changePassword);

// New APIs
router.get('/attendance-history', psAuth, ctrl.getAttendanceHistory);
router.get('/exam-results', psAuth, ctrl.getExamResults);
router.get('/transport-info', psAuth, ctrl.getTransportInfo);
router.get('/profile', psAuth, ctrl.getStudentProfile);
router.post('/message/send', psAuth, ctrl.sendMessageToTeacher);
router.get('/messages', psAuth, ctrl.getMessages);
router.post('/payment/initiate', psAuth, ctrl.initiateFeePayment);
router.post('/payment/confirm', psAuth, ctrl.confirmPayment);
router.post('/leave/apply', psAuth, ctrl.applyLeave);
router.get('/leave/history', psAuth, ctrl.getLeaveHistory);

// Warden only
router.get('/warden/services', psAuth, ctrl.getWardenServices);
router.post('/warden/services', psAuth, ctrl.recordWardenService);

// Admin — create/manage users
router.post('/admin/create-user', auth, ctrl.createUser);
router.get('/admin/users', auth, ctrl.getAllUsers);

module.exports = router;
