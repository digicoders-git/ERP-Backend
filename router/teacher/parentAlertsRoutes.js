const express = require('express');
const router = express.Router();
const parentAlertsController = require('../../controller/teacher/parentAlertsController');
const auth = require('../../middleware/auth');

// Send SMS alert
router.post('/send-sms', auth, parentAlertsController.sendSMSAlert);

// Send email alert
router.post('/send-email', auth, parentAlertsController.sendEmailAlert);

// Send bulk alerts
router.post('/bulk', auth, parentAlertsController.sendBulkAlerts);

// Get alert history
router.get('/history', auth, parentAlertsController.getAlertHistory);

// Get alert templates
router.get('/templates', auth, parentAlertsController.getAlertTemplates);

// Get absent students for alerts
router.get('/absent-students', auth, parentAlertsController.getAbsentStudents);

module.exports = router;
