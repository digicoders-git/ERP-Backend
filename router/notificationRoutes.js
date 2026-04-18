const express = require('express');
const router = express.Router();
const notificationController = require('../controller/notificationController');
const staffAuth = require('../middleware/staffAuth');

router.get('/', staffAuth, notificationController.getNotifications);
router.post('/', staffAuth, notificationController.sendNotification);
router.get('/settings', staffAuth, notificationController.getSettings);
router.put('/settings', staffAuth, notificationController.updateSettings);

module.exports = router;
