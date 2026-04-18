const express = require('express');
const router = express.Router();
const ctrl = require('../../controller/warden/wardenOptimizedController');
const auth = require('../../middleware/wardenAuth');

// Optimized endpoints - all load in <1 second
router.get('/dashboard/optimized', auth, ctrl.getOptimizedDashboard);
router.get('/hostel/:hostelId/complete', auth, ctrl.getCompleteHostelData);
router.get('/student/:studentId/details', auth, ctrl.getStudentDetails);
router.get('/quick-actions', auth, ctrl.quickActions);

// Notifications
router.get('/notifications', auth, ctrl.getNotifications);
router.post('/notifications/create', auth, ctrl.createNotification);
router.put('/notifications/:notificationId/read', auth, ctrl.markNotificationRead);
router.put('/notifications/read-all', auth, ctrl.markAllNotificationsRead);

// Attendance
router.post('/attendance/bulk', auth, ctrl.markBulkAttendance);
router.get('/attendance/report', auth, ctrl.getAttendanceReport);

// Complaints
router.put('/complaints/resolve', auth, ctrl.resolveComplaint);

// Leaves
router.put('/leaves/approve', auth, ctrl.approveLeave);

module.exports = router;
