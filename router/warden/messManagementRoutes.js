const express = require('express');
const router = express.Router();
const ctrl = require('../../controller/warden/messManagementController');
const auth = require('../../middleware/auth');

router.get('/data', auth, ctrl.getMessData);
router.get('/qr-config', auth, ctrl.getQRConfig);
router.post('/public-complaint', ctrl.submitPublicComplaint); // no auth - for QR link

module.exports = router;
