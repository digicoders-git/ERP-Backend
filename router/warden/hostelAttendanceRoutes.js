const express = require('express');
const router = express.Router();
const ctrl = require('../../controller/warden/hostelAttendanceController');
const auth = require('../../middleware/auth');

router.get('/all', auth, ctrl.getAttendance);
router.post('/save', auth, ctrl.saveAttendance);
router.get('/stats', auth, ctrl.getStats);

module.exports = router;
