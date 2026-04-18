const express = require('express');
const router = express.Router();
const hostelController = require('../controller/hostelOptimizedController');
const auth = require('../middleware/flexibleAuth');

router.get('/stats', auth, hostelController.getHostelStats);
router.get('/hostels', auth, hostelController.getHostels);
router.get('/rooms', auth, hostelController.getRooms);
router.get('/allocations', auth, hostelController.getAllocations);
router.get('/vacant-rooms', auth, hostelController.getVacantRooms);
router.get('/dashboard', auth, hostelController.getHostelDashboard);

module.exports = router;
