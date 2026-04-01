const express = require('express');
const router = express.Router();
const leaveController = require('../controller/leaveController');
const auth = require('../middleware/auth');

router.post('/apply', auth, leaveController.applyLeave);
router.post('/create', auth, leaveController.applyLeave);
router.get('/all', auth, leaveController.getAllLeaves);
router.put('/update/:id', auth, leaveController.updateLeave);
router.patch('/:id/status', auth, leaveController.updateLeaveStatus);
router.delete('/:id', auth, leaveController.deleteLeave);

module.exports = router;
