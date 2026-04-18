const express = require('express');
const router = express.Router();
const ctrl = require('../../controller/warden/analyticsController');
const auth = require('../../middleware/wardenAuth');

router.get('/', auth, ctrl.getAnalytics);
router.get('/overview', auth, ctrl.getAnalytics);
router.get('/occupancy', auth, ctrl.getAnalytics);
router.get('/attendance', auth, ctrl.getAnalytics);

module.exports = router;
