const express = require('express');
const router = express.Router();
const biometricSyncController = require('../../controller/staff/biometricSyncController');

// Public endpoints for devices
router.post('/test-sync', biometricSyncController.testSync);
router.post('/live-sync', biometricSyncController.liveSync);

module.exports = router;
