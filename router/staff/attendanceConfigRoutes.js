const express = require('express');
const router = express.Router();
const attendanceConfigController = require('../../controller/staff/attendanceConfigController');
const authMiddleware = require('../../middleware/auth');

router.use(authMiddleware);

router.get('/settings', attendanceConfigController.getSettings);
router.put('/settings', attendanceConfigController.updateSettings);

module.exports = router;
