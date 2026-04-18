const express = require('express');
const router = express.Router();
const ctrl = require('../../controller/warden/messManagementController');
const auth = require('../../middleware/wardenAuth');

router.get('/all', auth, ctrl.getMessData);
router.get('/data', auth, ctrl.getMessData);
router.get('/qr-config', auth, ctrl.getQRConfig);
router.post('/public-complaint', ctrl.submitPublicComplaint); 

module.exports = router;
