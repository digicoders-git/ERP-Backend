const express = require('express');
const router = express.Router();
const adminController = require('../controller/adminController');
const authMiddleware = require('../middleware/auth');

// Create Super Admin
router.post('/create', adminController.createSuperAdmin);

// Login Admin (Super Admin or Client Admin)
router.post('/login', adminController.loginAdmin);

// Update Password (Protected Route)
router.put('/update-password', authMiddleware, adminController.updatePassword);

// Toggle Admin Status (Protected Route)
router.patch('/toggle-status/:adminId', authMiddleware, adminController.toggleStatus);

// Dashboard Stats (Super Admin only)
const checkSuperAdmin = require('../middleware/checkSuperAdmin');
router.get('/dashboard-stats', checkSuperAdmin, adminController.getDashboardStats);

module.exports = router;
