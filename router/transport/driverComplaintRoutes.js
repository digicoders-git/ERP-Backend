const express = require('express');
const router = express.Router();
const ctrl = require('../../controller/transport/driverComplaintController');
const driverAuth = require('../../middleware/driverAuth');
const auth = require('../../middleware/auth');

// Driver routes
router.post('/submit', driverAuth, ctrl.submit);
router.get('/my-history', driverAuth, ctrl.getMyHistory);

// Admin routes
router.get('/branch/all', auth, ctrl.getAllForBranch);
router.put('/status/:id', auth, ctrl.updateStatus);

module.exports = router;
