const express = require('express');
const router = express.Router();
const leaveController = require('../controller/leaveController');
const flexibleAuth = require('../middleware/flexibleAuth');

router.post('/apply', flexibleAuth, leaveController.applyLeave);
router.post('/create', flexibleAuth, leaveController.applyLeave);
router.get('/all', flexibleAuth, leaveController.getAllLeaves);
router.put('/update/:id', flexibleAuth, leaveController.updateLeave);
router.patch('/:id/status', flexibleAuth, leaveController.updateLeaveStatus);
router.delete('/:id', flexibleAuth, leaveController.deleteLeave);

module.exports = router;
