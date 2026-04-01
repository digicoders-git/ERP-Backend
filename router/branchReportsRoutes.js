const express = require('express');
const router = express.Router();
const ctrl = require('../controller/branchReportsController');
const auth = require('../middleware/auth');

router.get('/overview', auth, ctrl.getOverviewReport);
router.get('/students', auth, ctrl.getStudentReport);
router.get('/fees', auth, ctrl.getFeeReport);
router.get('/attendance', auth, ctrl.getAttendanceReport);

module.exports = router;
