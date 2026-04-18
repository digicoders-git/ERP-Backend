const express = require('express');
const router = express.Router();
const ctrl = require('../../controller/warden/hostelAttendanceController');
const auth = require('../../middleware/wardenAuth');

router.get('/all', auth, ctrl.getAttendance);
router.post('/mark', auth, ctrl.saveAttendance);
router.get('/stats', auth, ctrl.getStats);

module.exports = router;
