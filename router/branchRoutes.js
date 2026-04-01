const express = require('express');
const router = express.Router();
const branchController = require('../controller/branchController');
const authMiddleware = require('../middleware/auth');

// All routes require authentication
router.post('/create', authMiddleware, branchController.createBranch);
router.get('/all', authMiddleware, branchController.getAllBranches);
router.get('/dashboard-stats', authMiddleware, branchController.getDashboardStats);
router.get('/:branchId', authMiddleware, branchController.getBranchById);
router.put('/update/:branchId', authMiddleware, branchController.updateBranch);
router.delete('/delete/:branchId', authMiddleware, branchController.deleteBranch);
router.patch('/toggle-status/:branchId', authMiddleware, branchController.toggleBranchStatus);

module.exports = router;
