const express = require('express');
const router = express.Router();
const feeDashboardController = require('../../controller/fee/feeDashboardController');
const auth = require('../../middleware/auth');

router.get('/summary', auth, feeDashboardController.getDashboardSummary);
router.get('/students', auth, feeDashboardController.getStudentsWithFeeStatus);
router.get('/lookup/:studentId', auth, feeDashboardController.getStudentLookup);

module.exports = router;
