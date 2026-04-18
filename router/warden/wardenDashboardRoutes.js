const express = require('express');
const router = express.Router();
const ctrl = require('../../controller/warden/wardenDashboardController');
const auth = require('../../middleware/wardenAuth');

router.get('/dashboard', auth, ctrl.getDashboardData);
router.get('/rooms-with-types', auth, ctrl.getRoomsWithTypes);
router.get('/floor-tracking', auth, ctrl.getFloorTracking);
router.get('/wardens', auth, ctrl.getWardens);
router.get('/hostels', auth, ctrl.getHostels);
router.get('/allocations', auth, ctrl.getAllocations);

module.exports = router;
