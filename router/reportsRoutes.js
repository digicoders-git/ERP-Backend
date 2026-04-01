const express = require('express');
const router = express.Router();
const reportsController = require('../controller/reportsController');
const auth = require('../middleware/auth');

router.get('/branch-report', auth, reportsController.getBranchReport);
router.get('/hostel-report', auth, reportsController.getHostelReport);

module.exports = router;
