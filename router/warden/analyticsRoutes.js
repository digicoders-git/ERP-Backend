const express = require('express');
const router = express.Router();
const ctrl = require('../../controller/warden/analyticsController');
const auth = require('../../middleware/auth');

router.get('/', auth, ctrl.getAnalytics);

module.exports = router;
