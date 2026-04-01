const express = require('express');
const router = express.Router();
const approvalController = require('../controller/approvalController');
const auth = require('../middleware/auth');

router.post('/create', auth, approvalController.createApproval);
router.get('/all', auth, approvalController.getAllApprovals);
router.get('/stats', auth, approvalController.getApprovalStats);
router.get('/:id', auth, approvalController.getApprovalById);
router.patch('/:id/status', auth, approvalController.updateApprovalStatus);
router.delete('/:id', auth, approvalController.deleteApproval);

module.exports = router;
