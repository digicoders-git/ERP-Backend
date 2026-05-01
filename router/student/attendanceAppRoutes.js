const express = require('express');
const router = express.Router();
const attendanceAppController = require('../../controller/staff/attendanceAppController');
const authMiddleware = require('../../middleware/auth');

router.use(authMiddleware);

router.post('/app-checkin', attendanceAppController.appCheckin);

module.exports = router;
