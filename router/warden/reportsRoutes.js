const express = require('express');
const router = express.Router();
const ctrl = require('../../controller/warden/reportsController');
const auth = require('../../middleware/wardenAuth');

router.get('/overview', auth, ctrl.getOverview);
router.get('/hostel-wise', auth, ctrl.getHostelWise);
router.get('/room-type-wise', auth, ctrl.getRoomTypeWise);
router.get('/monthly-trend', auth, ctrl.getMonthlyTrend);
router.get('/revenue', auth, ctrl.getRevenueReport);

module.exports = router;
