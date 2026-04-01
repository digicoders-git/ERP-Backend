const express = require('express');
const router = express.Router();
const hostelController = require('../controller/hostelController');
const auth = require('../middleware/auth');

router.post('/create', auth, hostelController.createHostel);
router.get('/all', auth, hostelController.getAllHostels);
router.get('/dashboard-stats', auth, hostelController.getHostelDashboardStats);
router.get('/:id', auth, hostelController.getHostelById);
router.put('/update/:id', auth, hostelController.updateHostel);
router.delete('/delete/:id', auth, hostelController.deleteHostel);
router.patch('/toggle-status/:id', auth, hostelController.toggleHostelStatus);

module.exports = router;
